import { useState, useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
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
  years_of_service?: number;
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
      console.log('Fetching profile data for user ID:', user.id);
      
      // Use the correct API endpoint (user-profile instead of profile)
      const response = await axios.get('/api/user-profile');
      console.log('Profile data response:', response.data);
      
      const profileData = response.data.profile || {};
      console.log('Processed profile data:', profileData);
      
      setProfileData(profileData);
      
      // Pre-populate form with existing data
      reset({
        first_name: profileData.first_name || '',
        last_name: profileData.last_name || '',
        email: profileData.email || user.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        dob: profileData.dob || '',
        emergency_contact: profileData.emergency_contact || '',
        years_of_service: profileData.years_of_service || 0,
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
      console.log('Submitting profile update:', data);
      
      // Use the correct API endpoint (user-profile instead of profile)
      const response = await axios.put('/api/user-profile', {
        ...data,
        id: user.id,
      });
      
      console.log('Profile update response:', response.data);
      toast.success('Profile updated successfully');
      setProfileData(response.data.profile || {});
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
                name="first_name"
                error={errors.first_name}
                icon={<FiUser className="text-apple-gray" />}
                register={register('first_name', { required: 'First name is required' })}
              />
              
              <FormInput
                label="Last Name"
                name="last_name"
                error={errors.last_name}
                icon={<FiUser className="text-apple-gray" />}
                register={register('last_name', { required: 'Last name is required' })}
              />
              
              <FormInput
                label="Email"
                name="email"
                error={errors.email}
                icon={<FiMail className="text-apple-gray" />}
                register={register('email', { required: 'Email is required' })}
                disabled
              />
              
              <FormInput
                label="Phone Number"
                name="phone"
                error={errors.phone}
                icon={<FiPhone className="text-apple-gray" />}
                register={register('phone')}
              />
              
              <FormInput
                label="Address"
                name="address"
                error={errors.address}
                icon={<FiMapPin className="text-apple-gray" />}
                register={register('address')}
              />
              
              <FormInput
                label="Date of Birth"
                name="dob"
                error={errors.dob}
                icon={<FiCalendar className="text-apple-gray" />}
                register={register('dob')}
                type="date"
              />
              
              <FormInput
                label="Emergency Contact"
                name="emergency_contact"
                error={errors.emergency_contact}
                icon={<FiInfo className="text-apple-gray" />}
                register={register('emergency_contact')}
              />
              
              <FormInput
                label="Years of Service"
                name="years_of_service"
                type="number"
                step="1"
                min="0"
                error={errors.years_of_service}
                icon={<FiCalendar className="text-apple-gray" />}
                register={register('years_of_service', {
                  valueAsNumber: true,
                  min: { value: 0, message: 'Years of service cannot be negative' }
                })}
                helperText="This affects your annual leave allocation"
              />
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