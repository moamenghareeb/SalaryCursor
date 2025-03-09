import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import FormInput from '../components/FormInput';
import LoadingButton from '../components/LoadingButton';
import { toast } from 'react-hot-toast';
import Head from 'next/head';
import { FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiInfo } from 'react-icons/fi';
import { useTheme } from '../lib/themeContext';

type ProfileFormData = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  dob?: string;
  emergency_contact?: string;
};

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { isDarkMode } = useTheme();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    mode: 'onBlur',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/user-profile');
        const { profile } = response.data;
        
        // Format date if exists
        if (profile.dob) {
          profile.dob = profile.dob.split('T')[0]; // Format YYYY-MM-DD
        }
        
        reset(profile);
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSubmitting(true);
      const response = await axios.put('/api/user-profile', data);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.status === 429) {
        toast.error('You can only update your profile once per hour');
      } else {
        toast.error(error.response?.data?.error || 'Failed to update profile');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <Head>
          <title>My Profile | SalaryCursor</title>
        </Head>
        <div className="max-w-2xl mx-auto bg-white dark:bg-dark-surface rounded-apple shadow-apple-card dark:shadow-dark-card p-6 animate-fadeIn">
          <h1 className="text-2xl font-semibold text-apple-gray-dark dark:text-dark-text-primary mb-6">My Profile</h1>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-apple-blue"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="First Name"
                  name="first_name"
                  type="text"
                  error={errors.first_name}
                  register={register('first_name', { 
                    required: 'First name is required',
                    maxLength: {
                      value: 50,
                      message: 'First name cannot exceed 50 characters'
                    }
                  })}
                />
                
                <FormInput
                  label="Last Name"
                  name="last_name"
                  type="text"
                  error={errors.last_name}
                  register={register('last_name', { 
                    required: 'Last name is required',
                    maxLength: {
                      value: 50,
                      message: 'Last name cannot exceed 50 characters'
                    }
                  })}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <FiMail className="text-apple-gray mr-2" />
                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  containerClassName="flex-1 mb-0"
                  error={errors.email}
                  register={register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <FiPhone className="text-apple-gray mr-2" />
                <FormInput
                  label="Phone Number"
                  name="phone"
                  type="tel"
                  containerClassName="flex-1 mb-0"
                  error={errors.phone}
                  register={register('phone', { 
                    pattern: {
                      value: /^[0-9+-\s()]{7,20}$/,
                      message: 'Invalid phone number'
                    }
                  })}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <FiMapPin className="text-apple-gray mr-2" />
                <FormInput
                  label="Address"
                  name="address"
                  type="text"
                  containerClassName="flex-1 mb-0"
                  error={errors.address}
                  register={register('address')}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <FiCalendar className="text-apple-gray mr-2" />
                <FormInput
                  label="Date of Birth"
                  name="dob"
                  type="date"
                  containerClassName="flex-1 mb-0"
                  error={errors.dob}
                  register={register('dob')}
                />
              </div>
              
              <div className="flex items-center mb-4">
                <FiInfo className="text-apple-gray mr-2" />
                <FormInput
                  label="Emergency Contact"
                  name="emergency_contact"
                  type="text"
                  containerClassName="flex-1 mb-0"
                  error={errors.emergency_contact}
                  register={register('emergency_contact')}
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t dark:border-dark-border">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm text-sm font-medium text-apple-gray-dark dark:text-dark-text-primary hover:bg-gray-50 dark:hover:bg-dark-surface/80 focus:outline-none"
                  onClick={() => reset()}
                  disabled={submitting}
                >
                  Reset
                </button>
                <LoadingButton
                  type="submit"
                  isLoading={submitting}
                  loadingText="Saving..."
                >
                  Save Changes
                </LoadingButton>
              </div>
            </form>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ProfilePage; 