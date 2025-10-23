import React, { useState, useEffect, useRef } from 'react';
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
              <Link to="/appointments" className="nav-btn" data-testid="appointments-link">
                My Appointments
              </Link>
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
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    user_type: 'patient'
  });
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

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h2 data-testid="auth-title">
            {isLogin ? 'Login to Your Account' : 'Create New Account'}
          </h2>
          
          {error && <div className="error-message" data-testid="error-message">{error}</div>}
          
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
          
          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setIsLogin(!isLogin)}
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

const DiseasePage = () => {
  const { diseaseId } = useParams();
  const [disease, setDisease] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiseaseAndProfessionals();
  }, [diseaseId]);

  const fetchDiseaseAndProfessionals = async () => {
    try {
      const [conditionRes, coachesRes] = await Promise.all([
        axios.get(`${API}/conditions/${diseaseId}`),
        axios.get(`${API}/conditions/${diseaseId}/coaches/`)
      ]);
      
      setDisease(conditionRes.data);
      setProfessionals(coachesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="professionals-grid" data-testid="professionals-grid">
          {professionals.map((professional) => (
            <div key={professional.id} className="professional-card" data-testid={`professional-${professional.id}`}>
              <img src={professional.profile_image} alt={professional.name} className="professional-image" />
              <div className="professional-info">
                <h3 className="professional-name">{professional.name}</h3>
                <p className="professional-qualification">{professional.qualification}</p>
                <div className="professional-details">
                  <span className="experience">{professional.years_experience} years experience</span>
                  <span className="rating">⭐ {professional.rating}</span>
                </div>
                <div className="languages">
                  {professional.languages.map(lang => (
                    <span key={lang} className="language-tag">{lang}</span>
                  ))}
                </div>
                <p className="professional-bio">{professional.bio}</p>
                <div className="professional-footer">
                  <span className="fee">₹{professional.consultation_fee}</span>
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
              <Route path="/" element={<HomePage />} />
              <Route path="/auth" element={<AuthPage setUser={setUser} />} />
              <Route path="/disease/:diseaseId" element={<DiseasePage />} />
              <Route path="/chat/:professionalId" element={<ChatPage user={user} />} />
              <Route path="/booking/:professionalId" element={<BookingPage user={user} />} />
              <Route path="/appointments" element={<AppointmentsPage user={user} />} />
              <Route path="/video-call/:appointmentId" element={<VideoCallPage user={user} />} />
            </Routes>
          </main>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
