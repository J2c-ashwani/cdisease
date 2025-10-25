import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Link, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
const API = `${BACKEND_URL}/api/v1`;

// Auth Context
const AuthContext = React.createContext();

// Components
const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" data-testid="nav-logo">
          HealthConsult 💊
        </Link>
        <div className="nav-menu">
          {user ? (
            <div className="nav-user">
              <span data-testid="user-name">Welcome, {user.name}</span>
              
              {/* Admin Dashboard Link */}
              {user.user_type === 'admin' && (
                <Link to="/admin/dashboard" className="nav-btn" data-testid="admin-dashboard-link">
                  🔐 Admin
                </Link>
              )}
              
              {/* Professional Dashboard Link */}
              {(user.user_type === 'professional' || user.user_type === 'coach') && (
                <Link to="/professional/dashboard" className="nav-btn" data-testid="dashboard-link">
                  📊 Dashboard
                </Link>
              )}
              
              {/* Patient Appointments Link */}
              {user.user_type === 'patient' && (
                <Link to="/appointments" className="nav-btn" data-testid="appointments-link">
                  My Appointments
                </Link>
              )}
              
              <button onClick={handleLogout} className="nav-btn" data-testid="logout-btn">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/auth" className="nav-btn" data-testid="login-link">
              Login / Register
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

const HomePage = () => {
  const [diseases, setDiseases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    try {
      const response = await axios.get(`${API}/conditions/`);
      setDiseases(response.data);
    } catch (error) {
      console.error('Failed to fetch conditions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading" data-testid="loading">Loading conditions...</div>;
  }

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 data-testid="hero-title">Expert Care for Chronic Conditions</h1>
          <p data-testid="hero-subtitle">
            Connect with certified healthcare professionals specializing in chronic diseases and women's health
          </p>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">500+</span>
              <span className="stat-label">Certified Doctors</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Consultations</span>
            </div>
            <div className="stat">
              <span className="stat-number">4.8★</span>
              <span className="stat-label">Patient Rating</span>
            </div>
          </div>
        </div>
      </section>

      <section className="diseases-section">
        <div className="section-header">
          <h2 data-testid="diseases-title">Find Care for Your Condition</h2>
          <p data-testid="diseases-subtitle">Select your condition to connect with specialists</p>
        </div>
        
        <div className="diseases-grid" data-testid="diseases-grid">
          {diseases.map((disease) => (
            <Link 
              key={disease.id} 
              to={`/disease/${disease.id}`} 
              className="disease-card"
              data-testid={`disease-card-${disease.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="disease-icon">{disease.icon}</div>
              <div className="disease-content">
                <h3 className="disease-name">{disease.name}</h3>
                <p className="disease-description">{disease.description}</p>
                <div className="disease-category">
                  <span className={`category-badge ${disease.color}`}>
                    {disease.category}
                  </span>
                </div>
                <div className="disease-symptoms">
                  <h4>Common Symptoms:</h4>
                  <div className="symptoms-list">
                    {disease.common_symptoms.slice(0, 3).map((symptom, idx) => (
                      <span key={idx} className="symptom-tag">{symptom}</span>
                    ))}
                    {disease.common_symptoms.length > 3 && (
                      <span className="symptom-tag">+{disease.common_symptoms.length - 3} more</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="features-section">
        <h2 data-testid="features-title">Why Choose HealthConsult?</h2>
        <div className="features-grid">
          <div className="feature-card" data-testid="feature-certified">
            <div className="feature-icon">🏥</div>
            <h3>Certified Professionals</h3>
            <p>All our healthcare providers are licensed and experienced specialists</p>
          </div>
          <div className="feature-card" data-testid="feature-secure">
            <div className="feature-icon">🔒</div>
            <h3>Secure & Private</h3>
            <p>Your medical information is protected with end-to-end encryption</p>
          </div>
          <div className="feature-card" data-testid="feature-convenient">
            <div className="feature-icon">⏰</div>
            <h3>Convenient Scheduling</h3>
            <p>Book consultations at your preferred time and date</p>
          </div>
        </div>
      </section>
    </div>
  );
};

const AuthPage = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    user_type: 'patient'
  });
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;
      
      const response = await axios.post(`${API}${endpoint}`, data);
      
      if (isLogin) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
        navigate('/');
      } else {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/auth/reset-password`, {
        email: resetEmail,
        new_password: newPassword
      });

      setError('Password reset successfully! You can now login with your new password.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetEmail('');
        setNewPassword('');
        setIsLogin(true);
        setError('');
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.detail || 'Password reset failed. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password View
  if (showForgotPassword) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-card">
            <h2>Reset Password</h2>
            
            {error && (
              <div className={`error-message ${error.includes('successfully') ? 'success' : ''}`}>
                {error}
              </div>
            )}
            
            <form onSubmit={handleResetPassword}>
              <input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
              
              <input
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength="6"
              />
              
              <button type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            
            <p className="auth-switch">
              Remember your password?{' '}
              <button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setResetEmail('');
                  setNewPassword('');
                }}
                className="auth-switch-btn"
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Login/Register View
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2 data-testid="auth-title">
            {isLogin ? 'Login to Your Account' : 'Create New Account'}
          </h2>
          
          {error && (
            <div className={`error-message ${error.includes('successful') ? 'success' : ''}`} data-testid="error-message">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} data-testid="auth-form">
            {!isLogin && (
              <>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  data-testid="name-input"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  data-testid="phone-input"
                />
                <select
                  value={formData.user_type}
                  onChange={(e) => setFormData({...formData, user_type: e.target.value})}
                  data-testid="user-type-select"
                >
                  <option value="patient">Patient</option>
                  <option value="professional">Healthcare Professional</option>
                </select>
              </>
            )}
            
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
              data-testid="email-input"
            />
            
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              data-testid="password-input"
            />
            
            <button type="submit" disabled={loading} data-testid="auth-submit-btn">
              {loading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
            </button>
          </form>
          
          {isLogin && (
            <p className="forgot-password-link">
              <button 
                onClick={() => setShowForgotPassword(true)}
                className="forgot-btn"
              >
                Forgot Password?
              </button>
            </p>
          )}
          
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="auth-switch-btn"
              data-testid="auth-switch-btn"
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
const CategorySelectionPage = () => {
  const navigate = useNavigate();

  const conditions = [
    { id: 'diabetes', name: 'Diabetes', icon: '🩸' },
    { id: 'hypertension', name: 'Hypertension', icon: '❤️' },
    { id: 'heart-disease', name: 'Heart Disease', icon: '💔' },
    { id: 'obesity', name: 'Weight Management', icon: '⚖️' },
    { id: 'arthritis', name: 'Arthritis', icon: '🦴' },
    { id: 'kidney-disease', name: 'Kidney Disease', icon: '🫘' },
    { id: 'thyroid', name: 'Thyroid', icon: '🦋' }
  ];

  const categories = [
    {
      id: 'nutritionist',
      title: 'Nutritionists',
      icon: '🥗',
      subtitle: 'Diet Plans & Nutrition Advice',
      description: 'Personalized meal plans and nutrition guidance',
      color: '#10b981',
      lightBg: '#ecfdf5',
      darkBg: '#d1fae5'
    },
    {
      id: 'fitness',
      title: 'Gym Trainers',
      icon: '💪',
      subtitle: 'Strength & Fitness Training',
      description: 'Customized workout plans and fitness coaching',
      color: '#3b82f6',
      lightBg: '#eff6ff',
      darkBg: '#dbeafe'
    },
    {
      id: 'yoga',
      title: 'Yoga Instructors',
      icon: '🧘',
      subtitle: 'Yoga Therapy & Mindfulness',
      description: 'Therapeutic yoga and stress management',
      color: '#8b5cf6',
      lightBg: '#f5f3ff',
      darkBg: '#ede9fe'
    }
  ];

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      
      {/* Hero Section - Clean & Professional */}
      <section style={{
        background: 'linear-gradient(180deg, #22d3ee 0%, #06b6d4 100%)',
        padding: '100px 20px 80px',
        color: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: '24px',
            lineHeight: '1.2',
            letterSpacing: '-0.02em'
          }}>
            Expert Health Consultations for<br />Chronic Disease Management
          </h1>
          <p style={{
            fontSize: 'clamp(1.1rem, 2vw, 1.3rem)',
            marginBottom: '50px',
            opacity: 0.95,
            maxWidth: '700px',
            margin: '0 auto 50px',
            lineHeight: '1.6'
          }}>
           Book one-on-one sessions with certified nutritionists, fitness trainers, and yoga instructors          </p>
          
          {/* Stats - Clean minimal design */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '30px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {[
              { number: '50+', label: 'Certified Coaches' },
              { number: '5K+', label: 'Consultations' },
              { number: '4.8⭐', label: 'Avg Rating' }
            ].map((stat, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: '32px 20px',
                border: '1px solid rgba(255,255,255,0.25)',
                transition: 'transform 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: '800', 
                  marginBottom: '8px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  {stat.number}
                </div>
                <div style={{ 
                  fontSize: '0.95rem', 
                  opacity: 0.95,
                  fontWeight: '500'
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section - Clean cards */}
      <section style={{ 
        padding: '80px 20px',
        background: '#fafafa'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              letterSpacing: '-0.01em'
            }}>
              Choose Your Wellness Coach
            </h2>
            <p style={{
              fontSize: '1.15rem',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Select a category and your health condition to connect with specialists
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gap: '32px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))'
          }}>
            {categories.map(category => (
              <div 
                key={category.id} 
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '48px 36px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                  e.currentTarget.style.borderColor = category.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.05)';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }}
              >
                {/* Top accent line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: category.color
                }} />

                {/* Icon & Title */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    background: category.lightBg,
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '3rem',
                    margin: '0 auto 24px'
                  }}>
                    {category.icon}
                  </div>
                  
                  <h3 style={{ 
                    fontSize: '1.75rem', 
                    fontWeight: '700',
                    color: category.color,
                    marginBottom: '8px',
                    letterSpacing: '-0.01em'
                  }}>
                    {category.title}
                  </h3>
                  
                  <p style={{ 
                    fontSize: '1rem', 
                    color: '#6b7280',
                    fontWeight: '600',
                    marginBottom: '12px'
                  }}>
                    {category.subtitle}
                  </p>
                  
                  <p style={{ 
                    fontSize: '0.95rem', 
                    color: '#9ca3af',
                    lineHeight: '1.6'
                  }}>
                    {category.description}
                  </p>
                </div>

                {/* Conditions Pills */}
                <div>
                  <div style={{ 
                    fontSize: '0.9rem', 
                    fontWeight: '700',
                    color: '#374151',
                    marginBottom: '20px',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Available For
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px',
                    justifyContent: 'center'
                  }}>
                    {conditions.map(condition => (
                      <button
                        key={condition.id}
                        onClick={() => navigate(`/condition/${condition.id}/${category.id}`)}
                        style={{
                          padding: '10px 18px',
                          border: `1.5px solid ${category.color}20`,
                          borderRadius: '20px',
                          background: 'white',
                          color: category.color,
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = category.color;
                          e.currentTarget.style.color = 'white';
                          e.currentTarget.style.borderColor = category.color;
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${category.color}40`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.color = category.color;
                          e.currentTarget.style.borderColor = `${category.color}20`;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span>{condition.icon}</span>
                        <span>{condition.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section - Clean & Trustworthy */}
      <section style={{
        padding: '80px 20px',
        background: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '70px' }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              letterSpacing: '-0.01em'
            }}>
              Why Choose HealthConsult?
            </h2>
            <p style={{
              fontSize: '1.15rem',
              color: '#6b7280',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Your health and privacy are our top priorities
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '48px'
          }}>
            {[
              {
                icon: '🎓',
                title: 'Certified Professionals',
                desc: 'All coaches are licensed, experienced, and specialized in chronic disease management',
                color: '#8b5cf6'
              },
              {
                icon: '🔒',
                title: 'Secure & Private',
                desc: 'Your health data is encrypted and protected with industry-leading security standards',
                color: '#06b6d4'
              },
              {
                icon: '📅',
                title: 'Flexible Scheduling',
                desc: 'Book sessions at times that work for you, with easy rescheduling options',
                color: '#10b981'
              }
            ].map((feature, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  background: `${feature.color}15`,
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  fontSize: '2.5rem',
                  border: `2px solid ${feature.color}30`
                }}>
                  {feature.icon}
                </div>
                <h3 style={{
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '12px',
                  letterSpacing: '-0.01em'
                }}>
                  {feature.title}
                </h3>
                <p style={{
                  fontSize: '1rem',
                  color: '#6b7280',
                  lineHeight: '1.7',
                  maxWidth: '340px',
                  margin: '0 auto'
                }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section style={{
        padding: '60px 20px',
        background: '#f9fafb',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <h3 style={{
            fontSize: '1.8rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '16px'
          }}>
            Ready to Start Your Wellness Journey?
          </h3>
          <p style={{
            fontSize: '1.05rem',
            color: '#6b7280',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            Choose a coach above and connect with a certified professional today
          </p>
        </div>
      </section>
    </div>
  );
};

const DiseasePage = () => {
  const { diseaseId } = useParams();
  const [disease, setDisease] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Wrap fetch function in useCallback to prevent infinite loop
  const fetchDiseaseAndProfessionals = useCallback(async () => {
    try {
      setLoading(true);
      
      const [conditionRes, coachesRes] = await Promise.all([
        axios.get(`${API}/conditions/${diseaseId}`),
        axios.get(`${API}/conditions/${diseaseId}/coaches`)
      ]);
      
      setDisease(conditionRes.data);
      
      // FIX: Extract coaches array from response
      const coachesData = Array.isArray(coachesRes.data) ? coachesRes.data : [];
      setProfessionals(coachesData);
     
      
      console.log('Coaches fetched:', coachesRes.data.coaches);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setDisease(null);
      setProfessionals([]);
    } finally {
      setLoading(false);
    }
  }, [diseaseId]); // Only depend on diseaseId

  useEffect(() => {
    if (diseaseId) {
      fetchDiseaseAndProfessionals();
    }
  }, [diseaseId, fetchDiseaseAndProfessionals]);

  if (loading) {
    return <div className="loading" data-testid="loading">Loading...</div>;
  }

  if (!disease) {
    return <div className="error">Condition not found</div>;
  }

  return (
    <div className="disease-page">
      <div className="disease-header">
        <div className="disease-info">
          <h1 data-testid="disease-name">{disease.name}</h1>
          <p data-testid="disease-description">{disease.description}</p>
          <span className={`category-badge ${disease.color}`} data-testid="disease-category">
            {disease.category}
          </span>
        </div>
      </div>

      <div className="professionals-section">
        <h2 data-testid="professionals-title">Available Specialists</h2>
        
        {/* Show message if no professionals found */}
        {professionals.length === 0 ? (
          <div className="no-professionals">
            <p>No specialists available for this condition yet.</p>
          </div>
        ) : (
          <div className="professionals-grid" data-testid="professionals-grid">
            {professionals.map((professional) => (
              <div key={professional.id} className="professional-card" data-testid={`professional-${professional.id}`}>
                <img 
                  src={professional.profile_image || 'https://via.placeholder.com/150'} 
                  alt={professional.name} 
                  className="professional-image" 
                />
                <div className="professional-info">
                  <h3 className="professional-name">{professional.name}</h3>
                  <p className="professional-qualification">{professional.qualification || 'Healthcare Professional'}</p>
                  <div className="professional-details">
                    <span className="experience">{professional.years_experience || 5} years experience</span>
                    <span className="rating">⭐ {professional.rating || 4.5}</span>
                  </div>
                  <div className="languages">
                    {(professional.languages || ['English']).map(lang => (
                      <span key={lang} className="language-tag">{lang}</span>
                    ))}
                  </div>
                  <p className="professional-bio">{professional.bio || 'Experienced healthcare professional'}</p>
                  <div className="professional-footer">
                    <span className="fee">₹{professional.consultation_fee || 500}</span>
                    <Link 
                      to={`/chat/${professional.id}?disease=${diseaseId}`}
                      className="consult-btn"
                      data-testid={`consult-btn-${professional.id}`}
                    >
                      Start Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// WHATSAPP-STYLE MFINE CHAT COMPONENT
// ============================================
const ChatPage = ({ user }) => {
  const { professionalId } = useParams();
  const [searchParams] = useSearchParams();
  const diseaseId = searchParams.get('disease');
  
  const [sessionId, setSessionId] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatCompleted, setChatCompleted] = useState(false);
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false); // ✅ USE REF INSTEAD OF STATE
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showTyping, showOptions]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // ✅ Prevent duplicate with ref - only runs once
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      startChatSession();
    }
  }, [user, professionalId, diseaseId, navigate]);

  const startChatSession = async () => {
    try {
      const response = await axios.post(`${API}/chat/start`, null, {
        params: { professional_id: professionalId, disease_id: diseaseId }
      });
      
      setSessionId(response.data.session_id);
      setAllQuestions(response.data.questions);
      setCurrentQuestionIndex(0);
      
      // Show first question after a delay
      setTimeout(() => {
        showNextQuestion(response.data.questions, 0);
      }, 800);
    } catch (error) {
      console.error('Failed to start chat session:', error);
      alert('Failed to start chat. Please try again.');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const showNextQuestion = (questions, index) => {
    if (index >= questions.length) {
      setChatCompleted(true);
      return;
    }

    const question = questions[index];
    
    // Show typing indicator
    setShowTyping(true);
    setShowOptions(false);

    // After 1.5 seconds, show the question
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: question.question_text,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      }]);
      setShowTyping(false);
      
      // Show options after question appears
      setTimeout(() => {
        setShowOptions(true);
      }, 300);
    }, 1500);
  };

  const handleAnswer = async (answer) => {
    if (!sessionId) return;

    const currentQuestion = allQuestions[currentQuestionIndex];
    
    // Add user's answer to messages
    setMessages(prev => [...prev, {
      type: 'user',
      text: answer,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    }]);

    // Hide options immediately
    setShowOptions(false);

    try {
      // Submit answer to backend
      await axios.post(`${API}/chat/answer`, {
        session_id: sessionId,
        question_id: currentQuestion.id,
        answer: answer
      });

      // Move to next question
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      // Show next question after a delay
      if (nextIndex < allQuestions.length) {
        setTimeout(() => {
          showNextQuestion(allQuestions, nextIndex);
        }, 1000);
      } else {
        // Chat completed
        setTimeout(() => {
          setChatCompleted(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to save answer. Please try again.');
    }
  };

  const proceedToBooking = () => {
    navigate(`/booking/${professionalId}?session=${sessionId}&disease=${diseaseId}`);
  };

  if (!user) {
    return (
      <div className="chat-page">
        <div className="loading">Please login to continue...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-page">
        <div className="loading">Starting your consultation...</div>
      </div>
    );
  }

  if (chatCompleted) {
    return (
      <div className="chat-completed">
        <div className="chat-container">
          <div className="success-icon">✅</div>
          <h2>Medical History Completed</h2>
          <p>
            Thank you for providing your medical history. You can now proceed to book your consultation.
          </p>
          <button onClick={proceedToBooking} className="proceed-btn">
            Proceed to Booking
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentQuestionIndex];

  return (
    <div className="chat-page">
      <div className="chat-container">
        <div className="chat-header">
          <div className="bot-avatar">🤖</div>
          <div className="header-info">
            <h2>Medical Assistant</h2>
            <p className="progress-text">
              Question {currentQuestionIndex + 1} of {allQuestions.length}
            </p>
          </div>
        </div>

        <div className="chat-messages-container">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.type}`}>
              <div className={`message-bubble ${msg.type}`}>
                <p className="message-text">{msg.text}</p>
                <div className="message-time">{msg.time}</div>
              </div>
            </div>
          ))}

          {showTyping && (
            <div className="chat-message bot">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {showOptions && currentQuestion && (
          <div className="answer-options">
            {currentQuestion.options && currentQuestion.options.map((option, index) => (
              <button
                key={index}
                className="option-btn"
                onClick={() => handleAnswer(option)}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BookingPage = ({ user }) => {
  const { professionalId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const diseaseId = searchParams.get('disease');
  
  const [professional, setProfessional] = useState(null);
  const [appointmentId, setAppointmentId] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00', '18:30'
  ];

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProfessionalDetails();
  }, [user, professionalId]);

  const fetchProfessionalDetails = async () => {
  try {
    // ✅ Fetch real professional data from backend
    const response = await axios.get(`${API}/conditions/${diseaseId}/coaches/`);
    const coaches = response.data;
    
    // Find the specific coach by ID
    const selectedCoach = coaches.find(coach => coach.id === professionalId);
    
    if (selectedCoach) {
      setProfessional(selectedCoach);
    } else {
      throw new Error('Professional not found');
    }
  } catch (error) {
    console.error('Failed to fetch professional details:', error);
    alert('Failed to load professional details');
    navigate(-1);
  } finally {
    setLoading(false);
  }
};


  const handleBooking = async () => {
  if (!selectedDate || !selectedTime) {
    alert('Please select both date and time');
    return;
  }

  setBooking(true);

  try {
    const scheduledTime = new Date(`${selectedDate}T${selectedTime}:00`);
    
    const response = await axios.post(`${API}/appointments`, {
      professional_id: professionalId,
      disease_id: diseaseId,
      chat_session_id: sessionId,
      scheduled_time: scheduledTime.toISOString()
    });

    // Save appointment ID
    setAppointmentId(response.data.id);
    setShowPayment(true);
  } catch (error) {
    console.error('Failed to create appointment:', error);
    alert('Failed to book appointment. Please try again.');
  } finally {
    setBooking(false);
  }
};


  const handlePayment = async () => {
  if (!appointmentId) {
    alert('No appointment found');
    return;
  }

  try {
    // ✅ CORRECT ENDPOINT PATH
    await axios.post(`${API}/appointments/payment/mock`, {
      appointment_id: appointmentId,
      amount: professional.consultation_fee
    });

    alert(`Payment successful! Your appointment is scheduled for ${new Date(selectedDate + 'T' + selectedTime).toLocaleString()}`);
    navigate('/appointments');
  } catch (error) {
    console.error('Payment failed:', error);
    console.error('Error details:', error.response?.data);
    alert(`Payment failed: ${error.response?.data?.detail || 'Please try again'}`);
  }
};

  if (!user) {
    return <div className="loading">Please login to continue...</div>;
  }

  if (loading) {
    return <div className="loading" data-testid="booking-loading">Loading booking details...</div>;
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="booking-page">
      <div className="booking-container">
        <div className="booking-header">
          <h2 data-testid="booking-title">Book Your Consultation</h2>
        </div>

        {professional && (
          <div className="professional-summary">
            <img src={professional.profile_image} alt={professional.name} className="prof-avatar" />
            <div className="prof-details">
              <h3 data-testid="professional-name">{professional.name}</h3>
              <p data-testid="professional-qualification">{professional.qualification}</p>
              <p className="consultation-fee" data-testid="consultation-fee">Consultation Fee: ₹{professional.consultation_fee}</p>
            </div>
          </div>
        )}

        <div className="booking-form">
          <div className="form-group">
            <label data-testid="date-label">Select Date</label>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              data-testid="date-input"
            />
          </div>

          <div className="form-group">
            <label data-testid="time-label">Select Time</label>
            <div className="time-slots" data-testid="time-slots">
              {timeSlots.map(time => (
                <button
                  key={time}
                  className={`time-slot ${selectedTime === time ? 'selected' : ''}`}
                  onClick={() => setSelectedTime(time)}
                  data-testid={`time-slot-${time}`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleBooking}
            disabled={booking || !selectedDate || !selectedTime}
            className="book-btn"
            data-testid="book-appointment-btn"
          >
            {booking ? 'Booking...' : 'Book Appointment'}
          </button>
        </div>

        {showPayment && (
          <div className="payment-modal" data-testid="payment-modal">
            <div className="payment-content">
              <h3>Complete Payment</h3>
              <p>Amount to pay: ₹{professional.consultation_fee}</p>
              <button 
              onClick={handlePayment}  
              className="pay-btn"
              data-testid="pay-now-btn"
               >
            Pay Now (Mock Payment)
             </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AppointmentsPage = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAppointments();
  }, [user]);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API}/appointments`);
      setAppointments(response.data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVideoCall = (appointmentId) => {
    navigate(`/video-call/${appointmentId}`);
  };

  const canJoinCall = (scheduledTime) => {
    const now = new Date();
    const appointmentTime = new Date(scheduledTime);
    const timeDiff = appointmentTime - now;
    const minutesDiff = timeDiff / (1000 * 60);
    
    return minutesDiff <= 15 && minutesDiff >= -60;
  };

  const getTimeStatus = (scheduledTime) => {
    const now = new Date();
    const appointmentTime = new Date(scheduledTime);
    const timeDiff = appointmentTime - now;
    const minutesDiff = timeDiff / (1000 * 60);
    
    if (minutesDiff > 15) {
      const hours = Math.floor(minutesDiff / 60);
      const mins = Math.floor(minutesDiff % 60);
      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `Starts in ${days} day${days > 1 ? 's' : ''}`;
      }
      return `Starts in ${hours}h ${mins}m`;
    } else if (minutesDiff > 0) {
      return `Starting in ${Math.floor(minutesDiff)} minutes`;
    } else if (minutesDiff >= -60) {
      return 'In progress';
    } else {
      return 'Completed';
    }
  };

  if (!user) {
    return <div className="loading">Please login to view appointments...</div>;
  }

  if (loading) {
    return <div className="loading" data-testid="appointments-loading">Loading appointments...</div>;
  }

  return (
    <div className="appointments-page">
      <div className="appointments-container">
        <h2 data-testid="appointments-title">My Appointments</h2>
        
        {appointments.length === 0 ? (
          <div className="no-appointments" data-testid="no-appointments">
            <p>No appointments booked yet.</p>
            <Link to="/" className="browse-btn">Browse Specialists</Link>
          </div>
        ) : (
          <div className="appointments-list" data-testid="appointments-list">
            {appointments.map(appointment => (
              <div key={appointment.id} className="appointment-card" data-testid={`appointment-${appointment.id}`}>
                <div className="appointment-info">
               <h3>Consultation Appointment</h3>
              <p><strong>Date:</strong> {new Date(appointment.scheduled_time).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(appointment.scheduled_time).toLocaleTimeString()}</p>
              <p><strong>Professional:</strong> {appointment.professional_name || 'N/A'}</p>
             <p><strong>Fee:</strong> ₹{appointment.consultation_fee}</p>
             <p><strong>Status:</strong> <span className={`status ${appointment.status}`}>{appointment.status}</span></p>
             <p><strong>Payment:</strong> <span className={`payment ${appointment.payment_status}`}>{appointment.payment_status}</span></p>
              <p className="time-status">{getTimeStatus(appointment.scheduled_time)}</p>
  
             {/* ✅ Show meeting link if paid */}
             {appointment.payment_status === 'paid' && appointment.meeting_link && (
            <p><strong>Meeting Link:</strong> <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer" className="meeting-link">{appointment.meeting_link}</a></p>
             )}
                </div>
                <div className="appointment-actions">
                  {appointment.status === 'scheduled' && appointment.payment_status === 'paid' && (
                    canJoinCall(appointment.scheduled_time) ? (
                      <button 
                        onClick={() => startVideoCall(appointment.id)}
                        className="video-btn active"
                        data-testid={`video-call-btn-${appointment.id}`}
                      >
                        Join Video Call 📹
                      </button>
                    ) : (
                      <button 
                        className="video-btn disabled"
                        disabled
                        title="Available 15 minutes before scheduled time"
                      >
                        Join Video Call 🔒
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const VideoCallPage = ({ user }) => {
  const { appointmentId } = useParams();
  const [callStarted, setCallStarted] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'system', message: 'Welcome to your consultation. The doctor will join shortly.' }
  ]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (!user) {
      return;
    }
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'doctor',
        message: 'Hello! I\'m Dr. Sarah Johnson. How are you feeling today?'
      }]);
    }, 3000);
  }, [user]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      setChatMessages(prev => [...prev, {
        id: prev.length + 1,
        sender: 'user',
        message: newMessage
      }]);
      setNewMessage('');

      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: prev.length + 1,
          sender: 'doctor',
          message: 'Thank you for sharing. Let me review your medical history and provide recommendations.'
        }]);
      }, 2000);
    }
  };

  if (!user) {
    return <div className="loading">Please login to join the call...</div>;
  }

  return (
    <div className="video-call-page">
      <div className="video-call-container">
        <div className="video-section">
          <div className="video-main" data-testid="video-main">
            <div className="mock-video doctor-video">
              <img 
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face" 
                alt="Dr. Sarah Johnson"
                className="doctor-avatar"
              />
              <div className="video-label">Dr. Sarah Johnson</div>
            </div>
          </div>
          
          <div className="video-controls" data-testid="video-controls">
            <button className="control-btn mute-btn" data-testid="mute-btn">🎤</button>
            <button className="control-btn video-btn" data-testid="video-btn">📹</button>
            <button className="control-btn end-btn" data-testid="end-call-btn">📞</button>
          </div>

          <div className="video-small">
            <div className="mock-video user-video">
              <div className="user-placeholder">You</div>
            </div>
          </div>
        </div>

        <div className="chat-section">
          <div className="chat-header">
            <h3 data-testid="chat-header">Live Chat</h3>
          </div>
          
          <div className="chat-messages" data-testid="chat-messages">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`message ${msg.sender}`} data-testid={`message-${msg.id}`}>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
          </div>
          
          <div className="chat-input" data-testid="chat-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              data-testid="message-input"
            />
            <button onClick={sendMessage} data-testid="send-message-btn">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
};
const ProfessionalsPage = () => {
  const { conditionId, professionalType } = useParams();
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const conditionNames = {
    'diabetes': { name: 'Diabetes', icon: '🩸' },
    'hypertension': { name: 'Hypertension', icon: '❤️' },
    'heart-disease': { name: 'Heart Disease', icon: '💔' },
    'obesity': { name: 'Weight Management', icon: '⚖️' },
    'arthritis': { name: 'Arthritis', icon: '🦴' },
    'kidney-disease': { name: 'Kidney Disease', icon: '🫘' },
    'thyroid': { name: 'Thyroid', icon: '🦋' }
  };

  const typeLabels = {
    'nutritionist': { label: 'Nutritionists', icon: '🥗', color: '#10b981' },
    'fitness': { label: 'Gym Trainers', icon: '💪', color: '#3b82f6' },
    'yoga': { label: 'Yoga Instructors', icon: '🧘', color: '#8b5cf6' }
  };

  useEffect(() => {
    fetchProfessionals();
  }, [conditionId, professionalType]);

  const fetchProfessionals = async () => {
    try {
      setLoading(true);
      
      // Use the working /coaches endpoint and filter by type
      const response = await axios.get(`${API}/conditions/${conditionId}/coaches`);
      
      // Filter by professional type
      const filtered = response.data.filter(
        prof => prof.professional_type === professionalType
      );
      
      setProfessionals(filtered);
      
    } catch (error) {
      console.error('Error fetching professionals:', error);
    } finally {
      setLoading(false);
    }
  };

  const condition = conditionNames[conditionId] || { name: conditionId, icon: '🏥' };
  const typeInfo = typeLabels[professionalType] || { label: 'Professionals', icon: '👥', color: '#6b7280' };

  if (loading) {
    return <div className="loading">Loading professionals...</div>;
  }

  return (
    <div className="professionals-page" style={{ padding: '40px 20px' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/')}
          style={{
            marginBottom: '30px',
            padding: '10px 20px',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          ← Back to Categories
        </button>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            marginBottom: '10px',
            color: typeInfo.color
          }}>
            {typeInfo.icon} {typeInfo.label}
          </h1>
          <h2 style={{ 
            fontSize: '1.5rem', 
            color: '#6b7280',
            fontWeight: '400'
          }}>
            for {condition.icon} {condition.name}
          </h2>
          <p style={{ 
            marginTop: '10px',
            fontSize: '1.1rem',
            color: '#9ca3af'
          }}>
            {professionals.length} {typeInfo.label.toLowerCase()} available
          </p>
        </div>

        {/* Professionals Grid */}
        {professionals.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            background: '#f9fafb',
            borderRadius: '12px'
          }}>
            <p style={{ fontSize: '1.2rem', color: '#6b7280' }}>
              No {typeInfo.label.toLowerCase()} available for this condition yet.
            </p>
            <button 
              onClick={() => navigate('/')}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: typeInfo.color,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Browse Other Categories
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '25px'
          }}>
            {professionals.map(professional => (
              <div
                key={professional.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '25px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  borderLeft: `4px solid ${typeInfo.color}`,
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onClick={() => navigate(`/chat/${professional.id}?disease=${conditionId}`)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {/* Professional Header */}
                <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                  <img 
                    src={professional.profile_image} 
                    alt={professional.name}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                  <div>
                    <h3 style={{ 
                      fontSize: '1.3rem', 
                      marginBottom: '5px',
                      color: '#1f2937'
                    }}>
                      {professional.name}
                    </h3>
                    <p style={{ 
                      fontSize: '0.9rem', 
                      color: '#6b7280',
                      marginBottom: '5px'
                    }}>
                      {professional.specialization}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                   <span style={{ color: '#fbbf24' }}>⭐ {professional.rating}</span>
                   <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                     {professional.years_experience} years exp
                     </span>
                     <span style={{ color: '#9ca3af' }}>•</span>
                    <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    🌐 {professional.languages?.join(', ') || 'English'}
                   </span>
                   </div>
                  </div>
                </div>

                {/* Bio */}
                <p style={{ 
                  fontSize: '0.95rem', 
                  color: '#4b5563',
                  lineHeight: '1.6',
                  marginBottom: '15px'
                }}>
                  {professional.bio.substring(0, 120)}...
                </p>

                {/* Details */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '15px',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <div>
                    <p style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: '600',
                      color: typeInfo.color
                    }}>
                      ₹{professional.consultation_fee}
                    </p>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
                      per session
                    </p>
                  </div>
                  <button style={{
                    padding: '10px 20px',
                    background: typeInfo.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '500'
                  }}>
                    Start Chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// PROFESSIONAL DASHBOARD
// ============================================
const ProfessionalDashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [chatHistory, setChatHistory] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [newFee, setNewFee] = useState('');
  const [feeChangeReason, setFeeChangeReason] = useState('');  // ✅ Added
  const [feeRequests, setFeeRequests] = useState([]);  // ✅ Added
  const [showRequestHistory, setShowRequestHistory] = useState(false);  // ✅ Added
  const navigate = useNavigate();

  // ✅ Added: Fetch fee request history
  const fetchFeeRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(`${API}/professional/fee-change-requests`, config);
      setFeeRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching fee requests:', error);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(`${API}/professional/dashboard`, config);
      
      console.log('✅ Dashboard data:', response.data);
      
      setStats(response.data);
      setAppointments(response.data.appointments || []);
      setNewFee(response.data.consultation_fee || 500);
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (error.response?.status === 401) {
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ✅ Updated useEffect
  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
    fetchFeeRequests();
  }, [user, navigate, fetchDashboardData, fetchFeeRequests]);

  const viewChatHistory = async (appointmentId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(
        `${API}/professional/appointments/${appointmentId}/chat-history`,
        config
      );
      setChatHistory(response.data);
      setSelectedAppointment(appointmentId);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      alert('Failed to load chat history');
    }
  };

  // ✅ Updated: Submit fee change request
  const updateConsultationFee = async () => {
    if (!newFee || !feeChangeReason) {
      alert('Please enter both new fee and reason for change');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(`${API}/professional/fee-change-request`, {
        new_fee: parseInt(newFee),
        reason: feeChangeReason
      }, config);
      
      alert('Fee change request submitted successfully! Waiting for admin approval.');
      setShowFeeModal(false);
      setFeeChangeReason('');
      fetchFeeRequests();
      
    } catch (error) {
      console.error('Failed to submit fee change request:', error);
      alert('Failed to submit fee change request');
    }
  };

  if (!user) {
    return <div className="loading">Please login to continue...</div>;
  }

  if (loading) {
    return <div className="loading" data-testid="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="professional-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Professional Dashboard</h1>
          <p>Welcome back, {user.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-info">
              <h3>{stats?.total_appointments || 0}</h3>
              <p>Total Appointments</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <h3>{stats?.completed_appointments || 0}</h3>
              <p>Completed</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-info">
              <h3>{stats?.upcoming_appointments || 0}</h3>
              <p>Upcoming</p>
            </div>
          </div>
          
          <div className="stat-card earnings-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>₹{stats?.net_earnings?.toLocaleString() || 0}</h3>
              <p>Net Earnings</p>
              <small>Commission: ₹{stats?.platform_commission?.toLocaleString() || 0}</small>
            </div>
          </div>
        </div>

        {/* This Month Earnings */}
        <div className="earnings-summary">
          <h2>This Month</h2>
          <div className="earnings-details">
            <div className="earnings-item">
              <span>Appointments:</span>
              <strong>{stats?.this_month_appointments || 0}</strong>
            </div>
            <div className="earnings-item">
              <span>Platform Fee (15%):</span>
              <strong className="commission">₹{stats?.platform_commission?.toLocaleString() || 0}</strong>
            </div>
          </div>
        </div>

        {/* Consultation Fee */}
        <div className="fee-section">
          <h3>Your Consultation Fee: ₹{stats?.consultation_fee || 500}</h3>
          <button onClick={() => setShowFeeModal(true)} className="update-fee-btn">
            Request Fee Change
          </button>
        </div>

        {/* Upcoming Appointments */}
        <div className="appointments-section">
          <h2>Upcoming Appointments ({appointments.length})</h2>
          {appointments.length === 0 ? (
            <p className="no-data">No upcoming appointments</p>
          ) : (
            <div className="appointments-list">
              {appointments.map(apt => (
                <div key={apt.id} className="appointment-item">
                  <div className="apt-info">
                    <h4>Patient #{apt.user_id?.substring(0, 8)}</h4>
                    <p>📅 {new Date(apt.scheduled_time).toLocaleDateString()}</p>
                    <p>⏰ {new Date(apt.scheduled_time).toLocaleTimeString()}</p>
                    <p>💰 ₹{apt.consultation_fee}</p>
                    <p><span className={`status-badge ${apt.status}`}>{apt.status}</span></p>
                  </div>
                  <div className="apt-actions">
                    <button 
                      onClick={() => viewChatHistory(apt.id)}
                      className="view-history-btn"
                    >
                      View Medical History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat History Modal */}
        {chatHistory && (
          <div className="modal-overlay" onClick={() => setChatHistory(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Patient Medical History</h2>
                <button onClick={() => setChatHistory(null)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <div className="patient-info">
                  <p><strong>Patient:</strong> {chatHistory.patient_name}</p>
                  <p><strong>Email:</strong> {chatHistory.patient_email}</p>
                  <p><strong>Session Date:</strong> {new Date(chatHistory.started_at).toLocaleString()}</p>
                </div>
                
                <h3>Medical Questionnaire Responses</h3>
                <div className="chat-answers">
                  {chatHistory.answers?.map((answer, index) => (
                    <div key={index} className="answer-item">
                      <p className="question"><strong>Q{index + 1}:</strong> {answer.question}</p>
                      <p className="answer">✓ {answer.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Updated Fee Change Request Modal */}
        {showFeeModal && (
          <div className="modal-overlay" onClick={() => setShowFeeModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Request Fee Change</h2>
                <button onClick={() => setShowFeeModal(false)} className="close-btn">×</button>
              </div>
              <div className="modal-body">
                <div className="fee-info-box" style={{ 
                  background: '#f0f9ff', 
                  padding: '15px', 
                  borderRadius: '8px', 
                  marginBottom: '20px' 
                }}>
                  <p>Current Fee: <strong>₹{stats?.consultation_fee || 500}</strong></p>
                </div>
                
                <label>New Consultation Fee (₹) *</label>
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  min="100"
                  max="10000"
                  placeholder="Enter new fee"
                  style={{ width: '100%', padding: '10px', marginBottom: '15px' }}
                />
                
                <label>Reason for Change *</label>
                <textarea
                  value={feeChangeReason}
                  onChange={(e) => setFeeChangeReason(e.target.value)}
                  placeholder="Please explain why you want to change your consultation fee..."
                  rows="4"
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    marginBottom: '10px',
                    borderRadius: '5px',
                    border: '1px solid #ccc'
                  }}
                />
                
                <div className="fee-calculation" style={{ 
                  background: '#f9fafb', 
                  padding: '10px', 
                  borderRadius: '5px', 
                  marginBottom: '15px' 
                }}>
                  <p style={{ margin: '5px 0' }}>Platform commission: 15%</p>
                  <p style={{ margin: '5px 0' }}>
                    <strong>Your net earnings: ₹{(newFee * 0.85).toFixed(0)}</strong>
                  </p>
                </div>
                
                <button 
                  onClick={updateConsultationFee} 
                  className="submit-btn"
                  disabled={!newFee || !feeChangeReason}
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    opacity: (!newFee || !feeChangeReason) ? 0.5 : 1
                  }}
                >
                  Submit Request
                </button>
                
                <button 
                  onClick={() => setShowRequestHistory(!showRequestHistory)}
                  className="view-history-btn"
                  style={{ 
                    width: '100%', 
                    marginTop: '10px', 
                    padding: '10px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  {showRequestHistory ? 'Hide' : 'View'} Request History
                </button>
                
                {/* ✅ Fee Request History */}
                {showRequestHistory && (
                  <div className="fee-requests-history" style={{ marginTop: '20px' }}>
                    <h3>Previous Requests</h3>
                    {feeRequests.length === 0 ? (
                      <p style={{ textAlign: 'center', color: '#666' }}>No previous fee change requests</p>
                    ) : (
                      <div className="requests-list">
                        {feeRequests.map(request => (
                          <div 
                            key={request.id} 
                            className={`request-item`}
                            style={{ 
                              border: '1px solid #e5e7eb', 
                              borderRadius: '8px', 
                              padding: '15px', 
                              marginBottom: '10px',
                              background: request.status === 'pending' ? '#fffbeb' : 
                                         request.status === 'approved' ? '#f0fdf4' : '#fef2f2'
                            }}
                          >
                            <div className="request-info">
                              <p style={{ margin: '5px 0' }}>
                                <strong>₹{request.current_fee} → ₹{request.requested_fee}</strong>
                              </p>
                              <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#666' }}>
                                {new Date(request.requested_at).toLocaleDateString()}
                              </p>
                              <span 
                                className={`status-badge`}
                                style={{
                                  display: 'inline-block',
                                  padding: '4px 12px',
                                  borderRadius: '12px',
                                  fontSize: '0.85em',
                                  fontWeight: 'bold',
                                  background: request.status === 'pending' ? '#fbbf24' :
                                            request.status === 'approved' ? '#10b981' : '#ef4444',
                                  color: 'white'
                                }}
                              >
                                {request.status.toUpperCase()}
                              </span>
                            </div>
                            {request.status !== 'pending' && (
                              <div className="admin-feedback" style={{ 
                                marginTop: '10px', 
                                paddingTop: '10px', 
                                borderTop: '1px solid #e5e7eb' 
                              }}>
                                <p style={{ fontSize: '0.85em', margin: '3px 0' }}>
                                  <small>Reviewed by: {request.reviewed_by}</small>
                                </p>
                                {request.admin_notes && (
                                  <p style={{ fontSize: '0.85em', margin: '3px 0' }}>
                                    <small><strong>Admin note:</strong> {request.admin_notes}</small>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// ADMIN DASHBOARD
// ============================================
const AdminDashboard = ({ user }) => {
  const [analytics, setAnalytics] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users, setUsers] = useState([]);
  const [feeRequests, setFeeRequests] = useState([]);  // ✅ Added
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ Added: Fetch fee requests
  const fetchFeeRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      const response = await axios.get(`${API}/admin/fee-change-requests?status=pending`, config);
      setFeeRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching fee requests:', error);
    }
  }, []);

  // ✅ Added: Handle fee approval
  const handleApproveFee = async (requestId) => {
    const notes = prompt('Admin notes (optional):');
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API}/admin/fee-change-requests/${requestId}/approve`,
        { notes: notes || '' },
        config
      );
      
      alert('Fee change approved successfully!');
      fetchFeeRequests();
      
    } catch (error) {
      console.error('Error approving fee change:', error);
      alert('Failed to approve fee change');
    }
  };

  // ✅ Added: Handle fee rejection
  const handleRejectFee = async (requestId) => {
    const notes = prompt('Reason for rejection (required):');
    
    if (!notes) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.post(
        `${API}/admin/fee-change-requests/${requestId}/reject`,
        { notes },
        config
      );
      
      alert('Fee change request rejected');
      fetchFeeRequests();
      
    } catch (error) {
      console.error('Error rejecting fee change:', error);
      alert('Failed to reject fee change');
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      const analyticsRes = await axios.get(`${API}/admin/analytics/overview`, config);
      setAnalytics(analyticsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      if (error.response?.status === 403) {
        alert('Admin access required');
        navigate('/');
      }
      setLoading(false);
    }
  }, [navigate]);

  const fetchTabData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      if (activeTab === 'professionals') {
        const profRes = await axios.get(`${API}/admin/professionals`, config);
        setProfessionals(profRes.data.professionals || []);
      } else if (activeTab === 'appointments') {
        const aptRes = await axios.get(`${API}/admin/appointments?limit=100`, config);
        setAppointments(aptRes.data.appointments || []);
      } else if (activeTab === 'users') {
        const usersRes = await axios.get(`${API}/admin/users?limit=100`, config);
        setUsers(usersRes.data.users || []);
      } else if (activeTab === 'fee-requests') {  // ✅ Added
        fetchFeeRequests();
      }
    } catch (error) {
      console.error('Failed to fetch tab data:', error);
    }
  }, [activeTab, fetchFeeRequests]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate, fetchDashboardData]);

  useEffect(() => {
    if (user && !loading && activeTab !== 'overview') {
      fetchTabData();
    }
  }, [activeTab, user, loading, fetchTabData]);

  const updateProfessionalStatus = async (professionalId, status) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };
      
      await axios.put(`${API}/admin/professionals/${professionalId}/status?status=${status}`, {}, config);
      alert(`Professional ${status} successfully!`);
      fetchTabData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update professional status');
    }
  };

  if (!user) {
    return <div className="loading">Please login to continue...</div>;
  }

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <p>Platform Management & Analytics</p>
        </div>

        {/* ✅ Updated Tab Navigation */}
        <div className="admin-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={activeTab === 'professionals' ? 'active' : ''}
            onClick={() => setActiveTab('professionals')}
          >
            👨‍⚕️ Professionals
          </button>
          <button 
            className={activeTab === 'appointments' ? 'active' : ''}
            onClick={() => setActiveTab('appointments')}
          >
            📅 Appointments
          </button>
          <button 
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          {/* ✅ Added Fee Requests Tab */}
          <button 
            className={activeTab === 'fee-requests' ? 'active' : ''}
            onClick={() => setActiveTab('fee-requests')}
          >
            💰 Fee Requests {feeRequests.length > 0 && `(${feeRequests.length})`}
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analytics && (
          <div className="overview-content">
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{analytics.total_patients}</h3>
                  <p>Total Patients</p>
                </div>
              </div>
              
              <div className="stat-card green">
                <div className="stat-icon">👨‍⚕️</div>
                <div className="stat-info">
                  <h3>{analytics.total_professionals}</h3>
                  <p>Total Professionals</p>
                </div>
              </div>
              
              <div className="stat-card purple">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <h3>{analytics.total_appointments}</h3>
                  <p>Total Appointments</p>
                  <small>{analytics.completed_appointments} completed</small>
                </div>
              </div>
              
              <div className="stat-card orange">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <h3>₹{analytics.total_revenue?.toLocaleString()}</h3>
                  <p>Total Revenue</p>
                  <small>Commission: ₹{analytics.platform_commission?.toLocaleString()}</small>
                </div>
              </div>
            </div>

            <div className="monthly-stats">
              <h2>This Month</h2>
              <div className="monthly-grid">
                <div className="monthly-item">
                  <span>Appointments</span>
                  <strong>{analytics.appointments_this_month}</strong>
                </div>
                <div className="monthly-item">
                  <span>Revenue</span>
                  <strong>₹{analytics.revenue_this_month?.toLocaleString()}</strong>
                </div>
                <div className="monthly-item">
                  <span>Platform Commission (15%)</span>
                  <strong>₹{((analytics.revenue_this_month || 0) * 0.15)?.toFixed(0)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professionals Tab */}
        {activeTab === 'professionals' && (
          <div className="professionals-content">
            <h2>Professional Management</h2>
            {professionals.length === 0 ? (
              <p className="no-data">No professionals found</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Qualification</th>
                      <th>Experience</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {professionals.map(prof => (
                      <tr key={prof.id}>
                        <td>{prof.name}</td>
                        <td>{prof.email}</td>
                        <td>{prof.qualification}</td>
                        <td>{prof.years_experience} years</td>
                        <td>₹{prof.consultation_fee}</td>
                        <td>
                          <span className={`status-badge ${prof.status}`}>
                            {prof.status}
                          </span>
                        </td>
                        <td className="actions">
                          {prof.status === 'pending' && (
                            <>
                              <button 
                                onClick={() => updateProfessionalStatus(prof.id, 'approved')}
                                className="approve-btn"
                              >
                                ✓ Approve
                              </button>
                              <button 
                                onClick={() => updateProfessionalStatus(prof.id, 'rejected')}
                                className="reject-btn"
                              >
                                ✗ Reject
                              </button>
                            </>
                          )}
                          {prof.status === 'approved' && (
                            <button 
                              onClick={() => updateProfessionalStatus(prof.id, 'rejected')}
                              className="reject-btn"
                            >
                              Suspend
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="appointments-content">
            <h2>All Appointments</h2>
            {appointments.length === 0 ? (
              <p className="no-data">No appointments found</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Professional</th>
                      <th>Patient</th>
                      <th>Fee</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt.id}>
                        <td>
                          {new Date(apt.scheduled_time).toLocaleDateString()}<br/>
                          <small>{new Date(apt.scheduled_time).toLocaleTimeString()}</small>
                        </td>
                        <td>{apt.professional_name || 'N/A'}</td>
                        <td>Patient #{apt.user_id?.substring(0, 8)}</td>
                        <td>₹{apt.consultation_fee}</td>
                        <td>
                          <span className={`status-badge ${apt.status}`}>
                            {apt.status}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${apt.payment_status}`}>
                            {apt.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="users-content">
            <h2>All Users</h2>
            {users.length === 0 ? (
              <p className="no-data">No users found</p>
            ) : (
              <div className="table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>User Type</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(usr => (
                      <tr key={usr.id}>
                        <td>{usr.name}</td>
                        <td>{usr.email}</td>
                        <td>{usr.phone || 'N/A'}</td>
                        <td>
                          <span className={`role-badge ${usr.user_type}`}>
                            {usr.user_type}
                          </span>
                        </td>
                        <td>
                          <span className={usr.is_active ? 'active-badge' : 'inactive-badge'}>
                            {usr.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{new Date(usr.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ✅ Added Fee Requests Tab */}
        {activeTab === 'fee-requests' && (
          <div className="fee-requests-section">
            <h2>Pending Fee Change Requests</h2>
            
            {feeRequests.length === 0 ? (
              <p className="no-data">No pending fee change requests</p>
            ) : (
              <div className="fee-requests-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                gap: '20px',
                marginTop: '20px'
              }}>
                {feeRequests.map(request => (
                  <div 
                    key={request.id} 
                    className="fee-request-card"
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div className="request-header" style={{ 
                      marginBottom: '15px', 
                      paddingBottom: '15px', 
                      borderBottom: '2px solid #f3f4f6' 
                    }}>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2em' }}>
                        {request.professional_name}
                      </h3>
                      <span style={{ fontSize: '0.85em', color: '#6b7280' }}>
                        {new Date(request.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="fee-change-details" style={{ marginBottom: '15px' }}>
                      <div className="fee-comparison" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: '10px'
                      }}>
                        <div className="current-fee" style={{ textAlign: 'center' }}>
                          <label style={{ display: 'block', fontSize: '0.85em', color: '#6b7280', marginBottom: '5px' }}>
                            Current Fee
                          </label>
                          <strong style={{ fontSize: '1.5em', color: '#374151' }}>
                            ₹{request.current_fee}
                          </strong>
                        </div>
                        <div className="arrow" style={{ fontSize: '2em', color: '#9ca3af' }}>→</div>
                        <div className="requested-fee" style={{ textAlign: 'center' }}>
                          <label style={{ display: 'block', fontSize: '0.85em', color: '#6b7280', marginBottom: '5px' }}>
                            Requested Fee
                          </label>
                          <strong style={{ fontSize: '1.5em', color: '#059669' }}>
                            ₹{request.requested_fee}
                          </strong>
                        </div>
                      </div>
                      
                      <div className="fee-change-amount" style={{ textAlign: 'center', marginTop: '10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '5px 15px',
                          borderRadius: '20px',
                          fontSize: '0.9em',
                          fontWeight: 'bold',
                          background: request.requested_fee > request.current_fee ? '#dcfce7' : '#fee2e2',
                          color: request.requested_fee > request.current_fee ? '#059669' : '#dc2626'
                        }}>
                          {request.requested_fee > request.current_fee ? '+' : ''}
                          ₹{Math.abs(request.requested_fee - request.current_fee)} 
                          ({((Math.abs(request.requested_fee - request.current_fee) / request.current_fee) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    
                    {request.reason && (
                      <div className="request-reason" style={{ 
                        background: '#f9fafb', 
                        padding: '12px', 
                        borderRadius: '8px',
                        marginBottom: '15px'
                      }}>
                        <strong style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>
                          Reason:
                        </strong>
                        <p style={{ margin: 0, fontSize: '0.9em', color: '#4b5563' }}>
                          {request.reason}
                        </p>
                      </div>
                    )}
                    
                    <div className="request-actions" style={{ 
                      display: 'flex', 
                      gap: '10px',
                      marginTop: '15px'
                    }}>
                      <button 
                        onClick={() => handleApproveFee(request.id)}
                        className="approve-btn"
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.95em'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        onClick={() => handleRejectFee(request.id)}
                        className="reject-btn"
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '0.95em'
                        }}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <div className="App">
        <BrowserRouter>
          <Navbar user={user} setUser={setUser} />
          <main className="main-content">
           <Routes>
  <Route path="/" element={<CategorySelectionPage />} />
  <Route path="/condition/:conditionId/:professionalType" element={<ProfessionalsPage />} />  {/* ADD THIS LINE */}
  <Route path="/auth" element={<AuthPage setUser={setUser} />} />
  <Route path="/disease/:diseaseId" element={<DiseasePage />} />
  <Route path="/chat/:professionalId" element={<ChatPage user={user} />} />
  <Route path="/booking/:professionalId" element={<BookingPage user={user} />} />
  <Route path="/appointments" element={<AppointmentsPage user={user} />} />
  <Route path="/video-call/:appointmentId" element={<VideoCallPage user={user} />} />
  
  {/* Dashboard Routes */}
  <Route path="/admin/dashboard" element={<AdminDashboard user={user} />} />
  <Route path="/professional/dashboard" element={<ProfessionalDashboard user={user} />} />
</Routes>

          </main>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
