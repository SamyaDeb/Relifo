import { Link, useNavigate } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SUPER_ADMIN_ADDRESS, USER_STATUS } from '../firebase/constants';

export default function LandingPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGoToDashboard = async () => {
    if (!isConnected || !address) return;

    try {
      // Check if Super Admin
      if (address.toLowerCase() === SUPER_ADMIN_ADDRESS.toLowerCase()) {
        navigate('/admin/dashboard');
        return;
      }

      // Check if user exists in Firestore (using lowercase for case-insensitive lookup)
      const userRef = doc(db, 'users', address.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // New user - go to role selection
        navigate('/register');
        return;
      }

      // Existing user
      const userData = userSnap.data();

      // Route based on status
      if (userData.status === USER_STATUS.PENDING) {
        navigate('/pending-approval', { state: { user: userData } });
      } else if (userData.status === USER_STATUS.REJECTED) {
        alert('Your application was rejected. Please contact support.');
        navigate('/register');
      } else if (userData.status === USER_STATUS.APPROVED) {
        navigate(`/${userData.role}/dashboard`);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const handleConnectWallet = async () => {
    try {
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        alert('MetaMask not found. Please install MetaMask extension from https://metamask.io');
        return;
      }

      // Directly request MetaMask to open
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Then connect using wagmi
      const injectedConnector = connectors.find(
        (connector) => connector.id === 'injected'
      );

      if (injectedConnector) {
        await connect({ connector: injectedConnector });
      } else if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      }
    } catch (err) {
      console.error('Connection error:', err);
      if (err.code === 4001) {
        alert('Connection rejected. Please approve the connection in MetaMask.');
      } else {
        alert(err.message || 'Failed to connect to MetaMask');
      }
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black">
      {/* Floating Dots Overlay */}
      <div className="pointer-events-none absolute inset-0 z-0">
        {[...Array(180)].map((_, i) => {
          const size = 2 + Math.random() * 3;
          return (
            <span
              key={i}
              className="absolute bg-white/30"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: `${size/2}px`,
                left: `${Math.random() * 99.5}%`,
                top: `${Math.random() * 99.5}%`,
                animation: `float-dot ${4 + Math.random() * 8}s ease-in-out infinite`,
                filter: 'blur(0.5px)',
                opacity: 0.6 + Math.random() * 0.3,
              }}
            />
          );
        })}
      </div>
      
      {/* Grid Overlay - Glowing from middle, fading at borders */}
      <div 
        className="pointer-events-none absolute top-0 left-0 right-0 z-0"
        style={{
          height: '100vh',
            backgroundImage: `
              linear-gradient(0deg, rgba(255,255,255,0.20) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.20) 1px, transparent 1px)
            `,
          backgroundSize: '60px 60px',
          backgroundPosition: 'center center',
          mask: 'radial-gradient(ellipse 60% 80% at center 30%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.08) 70%, transparent 100%)',
          WebkitMask: 'radial-gradient(ellipse 60% 80% at center 30%, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.08) 70%, transparent 100%)',
          backgroundBlendMode: 'screen',
        }}
      />
      
      {/* Single Continuous Green Glow - Much brighter and more visible */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none overflow-visible animate-float-glow" style={{ height: '60vh' }}>
        {/* Left Corner - Bright, 30-35vh */}
        <div 
          className="absolute left-0 w-[900px] rounded-full blur-[180px] animate-pulse-left"
          style={{ 
            bottom: '20px',
            height: '35vh',
            background: 'radial-gradient(ellipse 100% 100% at 0% 0%, rgba(100,255,100,1) 0%, rgba(34,180,34,0.95) 25%, rgba(0,255,120,0.85) 45%, rgba(76,255,76,0.65) 65%, transparent 85%)' 
          }}
        ></div>
        <div 
          className="absolute top-0 left-0 w-[750px] rounded-full blur-[160px] animate-pulse-left-slow"
          style={{ 
            height: '32vh',
            background: 'radial-gradient(ellipse 95% 100% at 0% 0%, rgba(0,255,120,0.98) 0%, rgba(100,255,100,0.92) 30%, rgba(34,180,34,0.75) 55%, rgba(0,255,120,0.5) 75%, transparent 90%)' 
          }}
        ></div>
        
        {/* Middle Top - Smaller, 15-20vh, positioned at top */}
        <div 
          className="absolute top-0 left-[35%] w-[1100px] rounded-full blur-[170px] animate-pulse-center"
          style={{ 
            height: '20vh',
            background: 'radial-gradient(ellipse 120% 100% at 50% 0%, rgba(76,255,76,0.9) 0%, rgba(0,255,100,0.72) 35%, rgba(34,139,34,0.55) 60%, rgba(76,255,76,0.3) 80%, transparent 92%)' 
          }}
        ></div>
        <div 
          className="absolute top-0 left-[40%] w-[900px] rounded-full blur-[145px] animate-pulse-center-slow"
          style={{ 
            height: '17vh',
            background: 'radial-gradient(ellipse 110% 100% at 50% 0%, rgba(34,139,34,0.8) 0%, rgba(76,255,76,0.68) 40%, rgba(0,255,100,0.45) 70%, transparent 88%)' 
          }}
        ></div>
        
        {/* Right Corner - Brightest and Largest, 45-50vh */}
        <div 
          className="absolute top-0 right-0 w-[1200px] rounded-full blur-[200px] animate-pulse-right"
          style={{ 
            height: '50vh',
            background: 'radial-gradient(ellipse 100% 100% at 100% 0%, rgba(76,255,76,0.98) 0%, rgba(0,255,100,0.88) 22%, rgba(34,139,34,0.75) 42%, rgba(76,255,76,0.55) 62%, rgba(0,255,100,0.35) 78%, transparent 90%)' 
          }}
        ></div>
        <div 
          className="absolute top-0 right-0 w-[1000px] rounded-full blur-[175px] animate-pulse-right-slow"
          style={{ 
            height: '48vh',
            background: 'radial-gradient(ellipse 95% 100% at 100% 0%, rgba(34,139,34,0.92) 0%, rgba(76,255,76,0.8) 28%, rgba(0,255,100,0.68) 50%, rgba(34,139,34,0.45) 72%, transparent 88%)' 
          }}
        ></div>
        <div 
          className="absolute top-0 right-0 w-[850px] rounded-full blur-[155px] animate-pulse-right-slower"
          style={{ 
            height: '45vh',
            background: 'radial-gradient(ellipse 90% 100% at 100% 0%, rgba(0,255,100,0.88) 0%, rgba(34,139,34,0.75) 32%, rgba(76,255,76,0.55) 58%, rgba(0,255,100,0.32) 78%, transparent 90%)' 
          }}
        ></div>
        
        {/* Connecting/blending layer for unified glow */}
        <div 
          className="absolute top-0 left-0 right-0 blur-[130px] animate-pulse-blend"
          style={{ 
            height: '30vh',
            background: 'linear-gradient(to right, rgba(76,255,76,0.65) 0%, rgba(34,139,34,0.58) 12%, rgba(0,255,100,0.52) 28%, rgba(76,255,76,0.55) 45%, rgba(34,139,34,0.6) 62%, rgba(0,255,100,0.7) 78%, rgba(76,255,76,0.75) 92%, rgba(34,139,34,0.65) 100%)' 
          }}
        ></div>
        
        {/* Bright accent at corners */}
        <div 
          className="absolute top-0 left-[1%] w-[450px] rounded-full blur-[120px] animate-pulse-accent"
          style={{ 
            height: '25vh',
            background: 'radial-gradient(circle at 0% 0%, rgba(100,255,100,0.95) 0%, rgba(0,255,120,0.82) 45%, rgba(34,180,34,0.65) 70%, transparent 85%)' 
          }}
        ></div>
        <div 
          className="absolute top-0 right-[1%] w-[550px] rounded-full blur-[135px] animate-pulse-accent-slow"
          style={{ 
            height: '32vh',
            background: 'radial-gradient(circle at 100% 0%, rgba(100,255,100,0.98) 0%, rgba(34,180,34,0.88) 40%, rgba(0,255,120,0.72) 65%, transparent 85%)' 
          }}
        ></div>
        
        {/* Additional top overlay for more visibility */}
        <div 
          className="absolute top-0 left-0 right-0 blur-[100px]"
          style={{ 
            height: '40vh',
            background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(76,255,76,0.5) 0%, rgba(34,139,34,0.38) 30%, rgba(0,255,100,0.3) 55%, transparent 85%)' 
          }}
        ></div>
      </div>

      {/* Top Navbar */}
      <div className="absolute left-0 right-0 z-10 py-4 px-4 top-[20px]">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl"></div>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-black">Relifo</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => scrollToSection('home')}
              className="text-black hover:text-gray-700 transition cursor-pointer text-base font-medium"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-black hover:text-gray-700 transition cursor-pointer text-base font-medium"
            >
              About
            </button>
            <button
              onClick={handleGoToDashboard}
              className="text-black hover:text-gray-700 transition cursor-pointer text-base font-medium"
            >
              Dashboard
            </button>
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center">
            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-full border border-white/10 transition-all"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={handleDisconnectWallet}
                className="bg-black hover:bg-gray-900 text-white px-6 py-3 rounded-full border border-white/10 transition-all"
              >
                Disconnect
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="max-w-7xl mx-auto text-center relative z-10 -translate-y-[52px]">
          <h1 className="text-white mb-[54px]">
            <div className="w-full flex justify-center items-center">
              <div className="text-[5.5rem] font-medium leading-[0.95] mb-4 text-center w-full">
                Transparent. Relief. Real Impact.
              </div>
            </div>
          </h1>

          <h2
            className="text-3xl md:text-5xl lg:text-6xl italic mb-8 max-w-4xl font-normal bg-gradient-to-r from-pink-600 to-pink-300 bg-clip-text text-transparent"
            style={{ opacity: 1, transform: 'none', position: 'relative', left: '150px' }}
          >
            Relief with transparency.
          </h2>
          <p className="text-white/70 text-lg md:text-2xl mb-12 max-w-2xl mx-auto leading-relaxed font-light" style={{ marginTop: '5px' }}>
            Every Donation. Live Impact.
            <br />
            Just instant on-chain inheritance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/register"
              className="bg-white text-black hover:bg-gray-100 font-medium px-8 py-3 rounded-full transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Blockchain Security</h3>
              <p className="text-white/70">
                Every transaction is recorded on the blockchain, ensuring complete transparency and immutability.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Full Transparency</h3>
              <p className="text-white/70">
                Track every donation from donor to beneficiary. See exactly how funds are being utilized.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Instant Impact</h3>
              <p className="text-white/70">
                Direct fund allocation to beneficiaries. No intermediaries, no delays, just immediate relief.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About Relifo
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Relifo is a revolutionary disaster relief platform built on blockchain technology.
            We connect donors, organizers, and beneficiaries in a transparent ecosystem where
            every contribution makes a verified impact.
          </p>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-left">
            <h3 className="text-2xl font-bold text-white mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Create Campaign</h4>
                  <p className="text-white/70">Organizers create disaster relief campaigns with specific goals and requirements.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Donate Relief Tokens</h4>
                  <p className="text-white/70">Donors purchase RELIEF tokens and contribute to campaigns they believe in.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Allocate to Beneficiaries</h4>
                  <p className="text-white/70">Organizers allocate funds to verified beneficiaries through smart contracts.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-emerald-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Track & Verify</h4>
                  <p className="text-white/70">All transactions are recorded on blockchain - fully transparent and verifiable.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-white/70 mb-8">
            Join Relifo today and be part of the transparent relief revolution.
          </p>
          <Link
            to="/login"
            className="inline-block bg-white text-black px-12 py-5 rounded-full font-bold text-xl hover:bg-gray-100 transition-all transform hover:scale-105"
          >
            Connect Wallet & Start
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-black">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/50">
            © 2026 Relifo. Powered by Polygon Blockchain. Built for transparency.
          </p>
        </div>
      </footer>

      <style>{`
                /* Floating Dots Animation */
                @keyframes float-dot {
                  0%, 100% { transform: translateY(0) scale(1); }
                  25% { transform: translateY(-18px) scale(1.08); }
                  50% { transform: translateY(12px) scale(0.95); }
                  75% { transform: translateY(-8px) scale(1.04); }
                }
        /* Left corner animations - 30-35vh */
        @keyframes pulse-left {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1) translateY(0);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.06) translateY(-8px);
          }
        }
        
        @keyframes pulse-left-slow {
          0%, 100% {
            opacity: 0.65;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.08);
          }
        }
        
        /* Middle top animations - 15-20vh */
        @keyframes pulse-center {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.75;
            transform: scale(1.05);
          }
        }
        
        @keyframes pulse-center-slow {
          0%, 100% {
            opacity: 0.52;
            transform: scale(1);
          }
          50% {
            opacity: 0.68;
            transform: scale(1.06);
          }
        }
        
        /* Right corner animations - 45-50vh (largest) */
        @keyframes pulse-right {
          0%, 100% {
            opacity: 0.75;
            transform: scale(1) translateY(0);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.05) translateY(-10px);
          }
        }
        
        @keyframes pulse-right-slow {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.07);
          }
        }
        
        @keyframes pulse-right-slower {
          0%, 100% {
            opacity: 0.62;
            transform: scale(1);
          }
          50% {
            opacity: 0.78;
            transform: scale(1.08);
          }
        }
        
        /* Blending layer for unified glow */
        @keyframes pulse-blend {
          0%, 100% {
            opacity: 0.35;
            transform: scaleY(1);
          }
          50% {
            opacity: 0.48;
            transform: scaleY(1.04);
          }
        }
        
        /* Corner accent animations */
        @keyframes pulse-accent {
          0%, 100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 0.72;
            transform: scale(1.08);
          }
        }
        
        @keyframes pulse-accent-slow {
          0%, 100% {
            opacity: 0.62;
            transform: scale(1);
          }
          50% {
            opacity: 0.78;
            transform: scale(1.1);
          }
        }
        
        /* Float animation for left-to-right movement */
        @keyframes float-glow {
          0%, 100% {
            transform: translateX(0px);
          }
          50% {
            transform: translateX(30px);
          }
        }

        .animate-pulse-left {
          animation: pulse-left 7s ease-in-out infinite;
        }
        
        .animate-pulse-left-slow {
          animation: pulse-left-slow 9s ease-in-out infinite;
        }
        
        .animate-pulse-center {
          animation: pulse-center 6s ease-in-out infinite;
        }
        
        .animate-pulse-center-slow {
          animation: pulse-center-slow 8s ease-in-out infinite;
        }

        .animate-pulse-right {
          animation: pulse-right 6.5s ease-in-out infinite;
        }
        
        .animate-pulse-right-slow {
          animation: pulse-right-slow 8.5s ease-in-out infinite;
        }
        
        .animate-pulse-right-slower {
          animation: pulse-right-slower 10s ease-in-out infinite;
        }
        
        .animate-pulse-blend {
          animation: pulse-blend 9s ease-in-out infinite;
        }
        
        .animate-pulse-accent {
          animation: pulse-accent 5.5s ease-in-out infinite;
        }
        
        .animate-pulse-accent-slow {
          animation: pulse-accent-slow 7s ease-in-out infinite;
        }

        .animate-float-glow {
          animation: float-glow 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
