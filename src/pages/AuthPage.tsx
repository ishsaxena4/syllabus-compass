import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, BookOpen, User, Building } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');
const nameSchema = z.string().min(1, 'This field is required').max(100, 'Must be less than 100 characters');

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organization, setOrganization] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  }>({});
  const {
    user,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const from = (location.state as {
    from?: {
      pathname: string;
    };
  })?.from?.pathname || '/';

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Handle successful login - set flag and navigate
  useEffect(() => {
    if (user) {
      // Fetch profile to get the first name
      const fetchProfileAndNavigate = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        const displayName = profile?.first_name || 
          user.user_metadata?.full_name?.split(' ')[0] || 
          user.user_metadata?.name?.split(' ')[0] || 
          'there';
        
        sessionStorage.setItem('justSignedIn', 'true');
        sessionStorage.setItem('displayName', displayName);
        navigate(from, { replace: true });
      };
      
      fetchProfileAndNavigate();
    }
  }, [user, navigate, from]);

  const validateForm = () => {
    const newErrors: {
      email?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    // Only validate name fields during signup
    if (!isLogin) {
      const firstNameResult = nameSchema.safeParse(firstName);
      if (!firstNameResult.success) {
        newErrors.firstName = firstNameResult.error.errors[0].message;
      }
      
      const lastNameResult = nameSchema.safeParse(lastName);
      if (!lastNameResult.success) {
        newErrors.lastName = lastNameResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    
    // Handle remember me
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }
    
    try {
      if (isLogin) {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              variant: 'destructive',
              title: 'Login failed',
              description: 'Invalid email or password. Please try again.'
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Login failed',
              description: error.message
            });
          }
        }
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast({
              variant: 'destructive',
              title: 'Sign up failed',
              description: 'An account with this email already exists. Try logging in instead.'
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Sign up failed',
              description: error.message
            });
          }
        } else {
          // Create profile after successful signup
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (newUser) {
            await supabase.from('profiles').insert({
              user_id: newUser.id,
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              organization: organization.trim() || null,
            });
          }
          
          toast({
            title: 'Account created!',
            description: 'Please check your email to verify your account.'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Google sign in failed',
          description: error.message
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      
      {/* Floating blurry blob - foggy window effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/40 via-primary/20 to-accent/30"
          style={{
            filter: 'blur(120px)',
          }}
          animate={{
            x: ['-10%', '60%', '30%', '-10%'],
            y: ['-10%', '20%', '60%', '-10%'],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Secondary smaller blob for depth */}
        <motion.div 
          className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-accent/30 via-secondary/20 to-primary/20"
          style={{
            filter: 'blur(100px)',
          }}
          animate={{
            x: ['70%', '20%', '50%', '70%'],
            y: ['60%', '30%', '-5%', '60%'],
            scale: [0.9, 1.05, 1, 0.9],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Subtle grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }} />

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }} 
        animate={{ opacity: 1, y: 0, scale: 1 }} 
        transition={{ duration: 0.6, ease: "easeOut" }} 
        className="w-full max-w-md relative z-10 p-4"
      >
        <div className="backdrop-blur-xl bg-card/80 rounded-2xl shadow-2xl border border-border/50 p-8">
          {/* Logo/Brand */}
          <motion.div 
            className="flex flex-col items-center mb-8" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <motion.div 
              className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mb-4 shadow-lg" 
              whileHover={{ scale: 1.05, rotate: 5 }} 
              whileTap={{ scale: 0.95 }}
            >
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground font-['Outfit',sans-serif] tracking-tight">
              SyllabusOS
            </h1>
            <AnimatePresence mode="wait">
              <motion.p 
                key={isLogin ? 'login-subtitle' : 'signup-subtitle'} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                transition={{ duration: 0.3 }} 
                className="text-muted-foreground text-sm mt-2"
              >
                {isLogin ? 'Welcome back! Need help with assignments?' : 'Start organizing your academic life'}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* Google Sign In */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <Button 
              type="button" 
              variant="outline" 
              className="w-full mb-6 h-12 text-base font-medium bg-background/50 hover:bg-background/80 border-border/60 transition-all duration-300 hover:shadow-md hover:border-primary/30" 
              onClick={handleGoogleSignIn} 
              disabled={isLoading}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>
          </motion.div>

          <motion.div 
            className="relative mb-6" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/80 px-3 text-muted-foreground font-medium">Or continue with email</span>
            </div>
          </motion.div>

          {/* Email/Password Form */}
          <motion.form 
            onSubmit={handleSubmit} 
            className="space-y-4" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {/* Name fields - only show during signup */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="firstName"
                          type="text"
                          placeholder="John"
                          value={firstName}
                          onChange={e => {
                            setFirstName(e.target.value);
                            if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                          }}
                          className="pl-10 h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="lastName"
                          type="text"
                          placeholder="Doe"
                          value={lastName}
                          onChange={e => {
                            setLastName(e.target.value);
                            if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                          }}
                          className="pl-10 h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                          disabled={isLoading}
                        />
                      </div>
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="organization" className="text-sm font-medium">
                      School / Organization <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <div className="relative group">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="organization"
                        type="text"
                        placeholder="Stanford University"
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        className="pl-10 h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }} 
                  className="pl-10 h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300" 
                  disabled={isLoading} 
                />
              </div>
              <AnimatePresence>
                {errors.email && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    className="text-sm text-destructive"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }} 
                  className="pl-10 h-12 bg-background/50 border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300" 
                  disabled={isLoading} 
                />
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -10 }} 
                    className="text-sm text-destructive"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Remember me checkbox - only show during login */}
            {isLogin && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label
                    htmlFor="rememberMe"
                    className="text-sm font-normal text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                <Link
                  to={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
                  className="text-xs font-medium text-primary hover:text-primary/80 hover:underline underline-offset-4"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? 'Sign in' : 'Create account'}
              </Button>
            </motion.div>
          </motion.form>

          {/* Toggle Login/Signup */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <AnimatePresence mode="wait">
              <motion.p 
                key={isLogin ? 'login' : 'signup'} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="text-center text-sm text-muted-foreground mt-6"
              >
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(!isLogin)} 
                  className="text-primary hover:text-primary/80 font-semibold transition-colors duration-200 hover:underline underline-offset-4" 
                  disabled={isLoading}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </button>
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>

        <motion.p 
          className="text-center text-xs text-muted-foreground/70 mt-6" 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </motion.div>
    </div>
  );
}