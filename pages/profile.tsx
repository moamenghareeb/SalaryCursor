import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Layout from '../components/Layout';
import FormInput from '../components/FormInput';
import LoadingButton from '../components/LoadingButton';
import { toast } from 'react-hot-toast';
import Head from 'next/head';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiInfo } from 'react-icons/fi';
import { useTheme } from '../lib/themeContext';
import { useAuth } from '../lib/authContext';
import { supabase } from '../lib/supabase';

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  dob?: string;
  emergency_contact?: string;
};

export default function ProfilePage() {
  const { isDarkMode } = useTheme();
  const { user, loading, session } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProfileFormData>();
  
  // Check auth on client side
  useEffect(() => {
    setIsClient(true);
    
    // Check session if auth context is done loading
    if (!loading && (!user || !session)) {
      window.location.href = '/login';
      return;
    }
    
    // Load profile data
    if (user && !loading) {
      fetchProfileData();
    }
  }, [user, loading, session]);
  
  const fetchProfileData = async () => {
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      setProfileData(data);
      
      // Pre-populate form with existing data
      reset({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || user.email || '',
        phone: data.phone || '',
        address: data.address || '',
        dob: data.dob || '',
        emergency_contact: data.emergency_contact || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoadingProfile(false);
    }
  };
  
  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      
      const response = await axios.put('/api/profile', {
        ...data,
        id: user.id,
      });
      
      toast.success('Profile updated successfully');
      setProfileData(response.data);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Show loading state until client-side rendering is available
  if (!isClient || loading || loadingProfile) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Head>
        <title>My Profile | SalaryCursor</title>
      </Head>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 animate-fadeIn">
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary">My Profile</h1>
          <p className="mt-2 text-apple-gray dark:text-dark-text-secondary">
            Manage your personal information and profile settings
          </p>
        </div>
        
        <div className="bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="First Name"
                error={errors.first_name?.message}
                icon={<FiUser className="text-apple-gray" />}
              >
                <input
                  type="text"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="John"
                  {...register('first_name', { required: 'First name is required' })}
                />
              </FormInput>
              
              <FormInput
                label="Last Name"
                error={errors.last_name?.message}
                icon={<FiUser className="text-apple-gray" />}
              >
                <input
                  type="text"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="Doe"
                  {...register('last_name', { required: 'Last name is required' })}
                />
              </FormInput>
              
              <FormInput
                label="Email"
                error={errors.email?.message}
                icon={<FiMail className="text-apple-gray" />}
              >
                <input
                  type="email"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="john.doe@example.com"
                  disabled
                  {...register('email', { required: 'Email is required' })}
                />
              </FormInput>
              
              <FormInput
                label="Phone Number"
                error={errors.phone?.message}
                icon={<FiPhone className="text-apple-gray" />}
              >
                <input
                  type="tel"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="+1 (555) 123-4567"
                  {...register('phone')}
                />
              </FormInput>
              
              <FormInput
                label="Address"
                error={errors.address?.message}
                icon={<FiMapPin className="text-apple-gray" />}
              >
                <input
                  type="text"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="123 Main St, City, Country"
                  {...register('address')}
                />
              </FormInput>
              
              <FormInput
                label="Date of Birth"
                error={errors.dob?.message}
                icon={<FiCalendar className="text-apple-gray" />}
              >
                <input
                  type="date"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  {...register('dob')}
                />
              </FormInput>
              
              <FormInput
                label="Emergency Contact"
                error={errors.emergency_contact?.message}
                icon={<FiInfo className="text-apple-gray" />}
              >
                <input
                  type="text"
                  className={`form-input ${isDarkMode ? 'dark' : ''}`}
                  placeholder="Name: (555) 123-4567"
                  {...register('emergency_contact')}
                />
              </FormInput>
            </div>
            
            <div className="flex justify-end">
              <LoadingButton
                type="submit"
                isLoading={isSaving}
                loadingText="Saving..."
              >
                Save Changes
              </LoadingButton>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
} 