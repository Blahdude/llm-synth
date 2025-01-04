import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { deleteUser } from 'firebase/auth';
import Layout from './Layout';

const Settings = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user is currently signed in');
      }

      await deleteUser(user);
      navigate('/'); // Redirect to login page after successful deletion
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:ml-64 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Layout />
      <div className="w-full max-w-md">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-merriweather text-red-700 mb-4">Danger Zone</h2>
          
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className={`w-full py-3 px-4 rounded-xl text-white transition
              ${isDeleting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {error}
            </div>
          )}
          
          <p className="mt-4 text-sm text-red-600">
            Warning: This action permanently deletes your account and all associated data.
            This cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings; 