import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Layout from './Layout';
import { AlertTriangle, Loader2 } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [password, setPassword] = useState('');
  const [showReauthDialog, setShowReauthDialog] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          username: user.displayName || user.email,
          uid: user.uid,
          email: user.email
        };
        setCurrentUser(userData);
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
      setError(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setShowReauthDialog(true);
  };

  const handleReauthenticate = async (e) => {
    e.preventDefault();
    setIsDeleting(true);
    setError('');

    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        throw new Error('No user is currently signed in');
      }

      const credential = EmailAuthProvider.credential(
        user.email,
        password
      );

      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      navigate('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#2C3E50]">
      <Layout 
        currentUser={currentUser}
        handleLogout={handleLogout}
      />
      
      <div className="flex">
        <div className="ml-[-11rem] w-[41rem] min-h-screen border-r border-white/10">
          <div className="w-full flex flex-col p-5">
            <h2 className="text-2xl mb-5 text-[#F2E6D8]">Settings</h2>

            <div className="space-y-5">
              {/* Account Section */}
              <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h3 className="text-xl text-[#F2E6D8] mb-4">Account</h3>
                <p className="text-[#F2E6D8]/60 mb-5">
                  Manage your account settings and preferences
                </p>
              </div>

              {/* Danger Zone */}
              <div className="p-5 rounded-xl bg-red-950/20 border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <h3 className="text-xl text-red-500">Danger Zone</h3>
                </div>

                <p className="text-[#F2E6D8]/60 mb-5">
                  Actions here can't be undone. Please proceed with caution.
                </p>

                {showReauthDialog ? (
                  <form onSubmit={handleReauthenticate} className="space-y-4">
                    <div>
                      <label className="block text-sm text-[#F2E6D8]/60 mb-2">
                        Please enter your password to confirm
                      </label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-[#F2E6D8] rounded-xl px-4 py-2.5"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isDeleting}
                      className={`w-full py-4 px-5 rounded-xl flex items-center justify-center gap-3 text-white font-medium text-lg transition-colors
                        ${isDeleting 
                          ? 'bg-red-500/50 cursor-not-allowed' 
                          : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 hover:text-red-400'
                        }`}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="animate-spin h-5 w-5" />
                          Deleting Account...
                        </>
                      ) : (
                        'Confirm Delete Account'
                      )}
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={handleDeleteAccount}
                    className="w-full py-4 px-5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-500 hover:text-red-400 font-medium text-lg transition-colors"
                  >
                    Delete Account
                  </button>
                )}

                {error && (
                  <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-500">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 