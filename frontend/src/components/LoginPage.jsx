import React, { useState } from 'react';
import { Music2 } from 'lucide-react';
import { auth, db, storage } from '../firebase';  // if in components folder
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    try {
      let userCredential;
      
      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const user = userCredential.user;
      onLogin({
        uid: user.uid,
        email: user.email
      });
      
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="min-h-screen bg-[#2C3E50] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-center overflow-hidden">
          <h1 className="text-2xl font-merriweather text-[#F2E6D8] text-center">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
        </div>
        
        <div className="bg-[#2C3E50] rounded-xl overflow-hidden">
          <div className="p-6 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 text-blue rounded-xl focus:border-color-white/10 focus:ring-2 focus:ring-white/10 focus:outline-none"
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 text-blue rounded-xl focus:border-color-white/10 focus:ring-2 focus:ring-white/10 focus:outline-none"
            />

            <button
              onClick={handleSubmit}
              className="w-full py-3 px-4 bg-white/10 text-[#F2E6D8] rounded-xl hover:bg-white/20"
            >
              {isRegistering ? 'Register' : 'Login'}
            </button>

            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full py-3 px-4 text-[#F2E6D8] text-sm hover:underline"
            >
              {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 