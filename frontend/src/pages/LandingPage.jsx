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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Top Navbar with 10px gap */}
      <div className="fixed top-[10px] left-0 right-0 z-50 py-4 pointer-events-none px-4">
        <nav className="flex max-w-4xl mx-auto border border-white/20 rounded-3xl bg-white/10 backdrop-blur-md shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(255,255,255,0.1),0px_0px_0px_1px_rgba(255,255,255,0.05)] px-4 py-2 items-center justify-between gap-[3px] relative pointer-events-auto">
          {/* Gradient Background */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/5 via-gray-100/10 to-white/5 rounded-3xl pointer-events-none"></div>

          {/* Logo */}
          <div className="flex items-center space-x-2 w-[150px] ml-[5px]">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-2 rounded-full w-8 h-8 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">Relifo</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-5 -ml-[10px] relative z-10">
            <button
              onClick={() => scrollToSection('home')}
              className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer"
            >
              <span className="hidden sm:block text-base text-white font-medium">Home</span>
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer"
            >
              <span className="hidden sm:block text-base text-white font-medium">About</span>
            </button>
            {isConnected && (
              <button
                onClick={handleGoToDashboard}
                className="relative text-white hover:text-white/80 items-center flex space-x-1 transition cursor-pointer"
              >
                <span className="hidden sm:block text-base text-white font-medium">Dashboard</span>
              </button>
            )}
          </div>

          {/* Connect/Disconnect Wallet Button */}
          <div className="flex items-center space-x-2 relative z-10">
            {!isConnected ? (
              <button
                onClick={handleConnectWallet}
                className="group relative flex cursor-pointer items-center justify-center whitespace-nowrap border border-white/10 px-6 py-3 text-white bg-black rounded-[100px] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px w-[150px] overflow-visible"
              >
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
                  <div className="absolute aspect-square bg-gradient-to-l from-[#10b981] to-transparent animate-border-orbit opacity-90" style={{width: '51px', offsetPath: 'rect(0px auto auto 0px round 40px)'}}></div>
                </div>
                <span className="relative z-20">Connect Wallet</span>
                <div className="pointer-events-none insert-0 absolute size-full rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"></div>
                <div className="pointer-events-none absolute -z-10 bg-black rounded-[100px] inset-[0.05em]"></div>
              </button>
            ) : (
              <button
                onClick={handleDisconnectWallet}
                className="group relative flex cursor-pointer items-center justify-center whitespace-nowrap border border-white/10 px-6 py-3 text-white bg-black rounded-[100px] transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px w-[150px] overflow-visible"
              >
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
                  <div className="absolute aspect-square bg-gradient-to-l from-[#10b981] to-transparent animate-border-orbit opacity-90" style={{width: '51px', offsetPath: 'rect(0px auto auto 0px round 40px)'}}></div>
                </div>
                <span className="relative z-20">Disconnect</span>
                <div className="pointer-events-none insert-0 absolute size-full rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f] transform-gpu transition-all duration-300 ease-in-out group-hover:shadow-[inset_0_-6px_10px_#ffffff3f] group-active:shadow-[inset_0_-10px_10px_#ffffff3f]"></div>
                <div className="pointer-events-none absolute -z-10 bg-black rounded-[100px] inset-[0.05em]"></div>
              </button>
            )}
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section id="home" className="pt-40 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Transparent Disaster
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Relief Platform
            </span>
          </h1>
          <p className="text-xl text-purple-200 mb-12 max-w-3xl mx-auto">
            Empowering communities with blockchain-powered transparency.
            Track every donation, ensure accountability, and deliver relief directly to those in need.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
            >
              Get Started
            </Link>
            <button
              onClick={() => scrollToSection('about')}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Floating Animation Elements */}
        <div className="absolute top-1/4 left-10 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-1/3 right-10 w-72 h-72 bg-pink-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/2 w-72 h-72 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Blockchain Security</h3>
              <p className="text-purple-200">
                Every transaction is recorded on the blockchain, ensuring complete transparency and immutability.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Full Transparency</h3>
              <p className="text-purple-200">
                Track every donation from donor to beneficiary. See exactly how funds are being utilized.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Instant Impact</h3>
              <p className="text-purple-200">
                Direct fund allocation to beneficiaries. No intermediaries, no delays, just immediate relief.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            About Relifo
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Relifo is a revolutionary disaster relief platform built on blockchain technology.
            We connect donors, organizers, and beneficiaries in a transparent ecosystem where
            every contribution makes a verified impact.
          </p>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 text-left">
            <h3 className="text-2xl font-bold text-white mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Create Campaign</h4>
                  <p className="text-purple-200">Organizers create disaster relief campaigns with specific goals and requirements.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Donate Relief Tokens</h4>
                  <p className="text-purple-200">Donors purchase RELIEF tokens and contribute to campaigns they believe in.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Allocate to Beneficiaries</h4>
                  <p className="text-purple-200">Organizers allocate funds to verified beneficiaries through smart contracts.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 flex-shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1">Track & Verify</h4>
                  <p className="text-purple-200">All transactions are recorded on blockchain - fully transparent and verifiable.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Make a Difference?
          </h2>
          <p className="text-xl text-purple-200 mb-8">
            Join Relifo today and be part of the transparent relief revolution.
          </p>
          <Link
            to="/login"
            className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-12 py-5 rounded-full font-bold text-xl hover:shadow-2xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
          >
            Connect Wallet & Start
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-purple-300">
            © 2026 Relifo. Powered by Polygon Blockchain. Built for transparency.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes border-orbit {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        .animate-border-orbit {
          animation: border-orbit 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
