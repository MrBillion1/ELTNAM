import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Send, Zap, Rocket, TrendingUp, Calendar, Code2, ExternalLink, Menu, X } from 'lucide-react';

const MantleAgenticPortal = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'agent',
      text: "Hey there! 👋 I'm your Mantle Ecosystem Guide. I can help you explore projects, discover events, and interact with dApps directly. What interests you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentView, setCurrentView] = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const mantleProjects = [
    {
      id: 1,
      name: 'Fusion',
      category: 'Infrastructure',
      description: 'Modular and composable smart contract framework',
      icon: '⚙️',
      status: 'Active',
      tvl: '$524M',
      url: 'https://fusion.mantle.xyz',
      actions: ['Deploy Contract', 'View Documentation', 'Join Discord'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 2,
      name: 'BitDAO Treasury',
      category: 'DAO Management',
      description: 'Decentralized treasury and governance for BitDAO',
      icon: '🏛️',
      status: 'Active',
      tvl: '$2.1B',
      url: 'https://bitdao.io',
      actions: ['View Treasury', 'Stake MNT', 'Vote on Proposals'],
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 3,
      name: 'ByteDex',
      category: 'DEX',
      description: 'Decentralized exchange with high liquidity',
      icon: '💱',
      status: 'Active',
      tvl: '$384M',
      url: 'https://bytedex.mantle.xyz',
      actions: ['Swap Tokens', 'Provide Liquidity', 'Farm Rewards'],
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 4,
      name: 'MantlePoint',
      category: 'Lending',
      description: 'Decentralized lending and borrowing protocol',
      icon: '💰',
      status: 'Active',
      tvl: '$156M',
      url: 'https://mantlepoint.mantle.xyz',
      actions: ['Deposit Collateral', 'Borrow Assets', 'Earn Interest'],
      color: 'from-yellow-500 to-orange-500'
    },
    {
      id: 5,
      name: 'MetaPass',
      category: 'NFT Platform',
      description: 'NFT marketplace and launchpad',
      icon: '🎨',
      status: 'Active',
      tvl: '$89M',
      url: 'https://metapass.mantle.xyz',
      actions: ['Browse Collections', 'Create NFT', 'Trade'],
      color: 'from-red-500 to-rose-500'
    },
    {
      id: 6,
      name: 'MantleStake',
      category: 'Staking',
      description: 'Liquid staking protocol for MNT tokens',
      icon: '🔒',
      status: 'Active',
      tvl: '$782M',
      url: 'https://mantlestake.mantle.xyz',
      actions: ['Stake MNT', 'Claim Rewards', 'Unstake'],
      color: 'from-indigo-500 to-blue-500'
    }
  ];

  const events = [
    {
      id: 1,
      name: 'Mantle Turing Hackathon',
      date: '2024-06-15',
      type: 'Hackathon',
      description: 'Build the future of Mantle ecosystem',
      participants: '500+',
      prize: '$500K'
    },
    {
      id: 2,
      name: 'Community AMA - Layer 2 Scaling',
      date: '2024-06-08',
      type: 'Community',
      description: 'Technical deep dive on Mantle scaling solutions',
      participants: '2K+',
      prize: 'Free MNT'
    },
    {
      id: 3,
      name: 'DeFi Summit 2024',
      date: '2024-06-20',
      type: 'Conference',
      description: 'Annual conference for DeFi builders',
      participants: '1K+',
      prize: 'Networking'
    }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages([...messages, newMessage]);

    // Simulate agent response based on keywords
    setTimeout(() => {
      let agentResponse = '';
      const input = inputValue.toLowerCase();

      if (input.includes('project') || input.includes('explore')) {
        agentResponse = "I found several amazing projects in the Mantle ecosystem! Check out the project explorer on the right. From DEXs to lending protocols, there's something for everyone. What type of project interests you most?";
        setCurrentView('projects');
      } else if (input.includes('event') || input.includes('hackathon')) {
        agentResponse = "The Mantle Turing Hackathon is coming up! It's a great opportunity to build on our ecosystem with $500K in prizes. I've loaded the events section for you. Want to learn more about participating?";
        setCurrentView('events');
      } else if (input.includes('stake') || input.includes('earn')) {
        const stakeProject = mantleProjects.find(p => p.name === 'MantleStake');
        agentResponse = "Perfect! MantleStake is your go-to for earning on MNT tokens. You can stake directly through our portal. The current APY is 8.5% and you'll receive mntETH instantly. Ready to stake?";
        setCurrentView('projects');
        setSelectedProject(stakeProject);
      } else if (input.includes('swap') || input.includes('trade')) {
        const dexProject = mantleProjects.find(p => p.name === 'ByteDex');
        agentResponse = "ByteDex is our leading DEX with deep liquidity pools. I've opened it up for you. You can swap any tokens, provide liquidity to earn fees, or farm rewards. What would you like to do?";
        setCurrentView('projects');
        setSelectedProject(dexProject);
      } else {
        agentResponse = "That's interesting! Let me help you explore the Mantle ecosystem. You can browse projects, check upcoming events, or tell me what you're looking for. Would you like to see featured projects or learn about specific use cases?";
        setCurrentView('home');
      }

      const response = {
        id: messages.length + 2,
        type: 'agent',
        text: agentResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, response]);
    }, 800);

    setInputValue('');
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: `Tell me more about ${project.name}`,
      timestamp: new Date()
    };
    setMessages([...messages, userMsg]);

    setTimeout(() => {
      const agentMsg = {
        id: messages.length + 2,
        type: 'agent',
        text: `${project.name} is a fantastic addition to the Mantle ecosystem! It has a TVL of ${project.tvl} and is currently ${project.status}. You can ${project.actions[0].toLowerCase()} or explore other features. Ready to dive in?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 opacity-5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 opacity-5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative h-screen flex">
        {/* Header for mobile */}
        <div className="md:hidden absolute top-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur border-b border-blue-500/20 flex items-center justify-between px-4 z-50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">MANTLE</h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-blue-500/20 rounded-lg transition">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar - Chat Interface */}
        <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 absolute md:relative w-full md:w-96 h-screen bg-slate-950/40 backdrop-blur-xl border-r border-blue-500/20 flex flex-col z-40 mt-16 md:mt-0`}>
          {/* Header */}
          <div className="p-6 border-b border-blue-500/20">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Zap className="text-yellow-400" size={24} />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Guide Agent</span>
            </h2>
            <p className="text-sm text-blue-200/60 mt-2">Your AI companion for the Mantle ecosystem</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-blue-600">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}>
                <div className={`max-w-xs p-3 rounded-lg text-sm leading-relaxed ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-800/60 border border-cyan-500/30 text-blue-100 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-blue-500/20">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about projects, events..."
                className="flex-1 bg-slate-800/50 border border-blue-500/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50 focus:outline-none focus:border-blue-500/60 transition"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg transition transform hover:scale-105 active:scale-95"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto md:mt-0 mt-16 p-6 md:p-8">
          {currentView === 'home' && (
            <div className="space-y-8 max-w-6xl">
              {/* Hero */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold">
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Mantle</span>
                  <span className="block text-3xl md:text-4xl text-blue-200/80 font-light mt-2">Ecosystem Portal</span>
                </h1>
                <p className="text-xl text-blue-100/60 max-w-2xl">
                  Explore projects, discover events, and interact with the most innovative dApps on Mantle. Your AI guide is here to help.
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <button onClick={() => { setCurrentView('projects'); }} className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-xl hover:border-blue-500/60 transition group">
                  <Rocket className="text-cyan-400 mb-3 group-hover:scale-110 transition" size={28} />
                  <h3 className="font-bold text-lg">Explore Projects</h3>
                  <p className="text-sm text-blue-200/60 mt-1">6 featured dApps</p>
                </button>
                <button onClick={() => { setCurrentView('events'); }} className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 rounded-xl hover:border-purple-500/60 transition group">
                  <Calendar className="text-pink-400 mb-3 group-hover:scale-110 transition" size={28} />
                  <h3 className="font-bold text-lg">Upcoming Events</h3>
                  <p className="text-sm text-purple-200/60 mt-1">Turing Hackathon</p>
                </button>
                <button onClick={() => { setCurrentView('projects'); }} className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-xl hover:border-emerald-500/60 transition group">
                  <TrendingUp className="text-emerald-400 mb-3 group-hover:scale-110 transition" size={28} />
                  <h3 className="font-bold text-lg">Top by TVL</h3>
                  <p className="text-sm text-emerald-200/60 mt-1">$4.3B total</p>
                </button>
              </div>

              {/* Featured Projects Preview */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Featured Projects</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {mantleProjects.slice(0, 2).map((project) => (
                    <div key={project.id} onClick={() => handleProjectSelect(project)} className={`p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/60 cursor-pointer transition group bg-gradient-to-br ${project.color} opacity-10 hover:opacity-20`}>
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-4xl">{project.icon}</span>
                          <span className="text-xs px-2 py-1 bg-blue-500/30 rounded-full">{project.category}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                        <p className="text-sm text-blue-100/70">{project.description}</p>
                        <div className="flex justify-between text-xs pt-2">
                          <span className="text-emerald-400">TVL: {project.tvl}</span>
                          <span className="text-cyan-400">→</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === 'projects' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h2 className="text-4xl font-bold mb-2">Mantle Projects</h2>
                <p className="text-blue-200/60">Explore all projects in the ecosystem</p>
              </div>

              {selectedProject ? (
                <div className="space-y-6">
                  {/* Project Detail */}
                  <div className={`p-8 rounded-xl border border-blue-500/30 bg-gradient-to-br ${selectedProject.color} opacity-20`}>
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="text-6xl mb-4">{selectedProject.icon}</div>
                        <h1 className="text-4xl font-bold mb-2">{selectedProject.name}</h1>
                        <p className="text-lg text-blue-100/70">{selectedProject.description}</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-500/30 border border-emerald-500/60 rounded-full text-sm text-emerald-200">{selectedProject.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-6 border-t border-b border-blue-500/20">
                      <div>
                        <p className="text-sm text-blue-200/60">Total Value Locked</p>
                        <p className="text-2xl font-bold text-emerald-400">{selectedProject.tvl}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-200/60">Category</p>
                        <p className="text-2xl font-bold text-cyan-400">{selectedProject.category}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold">Available Actions</h3>
                    <div className="grid gap-3">
                      {selectedProject.actions.map((action, idx) => (
                        <button key={idx} className="p-4 bg-slate-800/40 border border-blue-500/20 hover:border-blue-500/60 rounded-lg flex items-center justify-between group transition">
                          <span>{action}</span>
                          <ChevronRight size={20} className="group-hover:translate-x-1 transition" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* dApp Preview */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold">Live Interface</h3>
                    <div className="h-96 bg-slate-800/40 border border-blue-500/20 rounded-lg flex items-center justify-center hover:border-blue-500/60 transition">
                      <div className="text-center space-y-3">
                        <Code2 size={48} className="mx-auto text-blue-400 opacity-60" />
                        <p className="text-blue-200/60">Interactive dApp interface</p>
                        <a href={selectedProject.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:from-blue-500 hover:to-cyan-500 transition font-semibold">
                          Open on Mantle <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setSelectedProject(null)} className="px-6 py-2 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition">
                    ← Back to Projects
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {mantleProjects.map((project) => (
                    <div key={project.id} onClick={() => handleProjectSelect(project)} className={`p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/60 cursor-pointer transition group bg-gradient-to-br ${project.color} opacity-10 hover:opacity-20`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-4xl">{project.icon}</span>
                          <span className="text-xs px-2 py-1 bg-blue-500/30 rounded-full">{project.category}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{project.name}</h3>
                        <p className="text-sm text-blue-100/70 line-clamp-2">{project.description}</p>
                        <div className="flex justify-between items-center pt-4 border-t border-blue-500/10">
                          <span className="text-sm text-emerald-400 font-semibold">{project.tvl}</span>
                          <ChevronRight size={18} className="text-cyan-400 group-hover:translate-x-1 transition" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentView === 'events' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-4xl font-bold mb-2">Upcoming Events</h2>
                <p className="text-blue-200/60">Join the Mantle community</p>
              </div>

              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="p-6 rounded-xl border border-blue-500/20 hover:border-blue-500/60 transition bg-slate-800/20">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold">{event.name}</h3>
                          <span className="px-3 py-1 bg-blue-500/30 border border-blue-500/60 rounded-full text-xs">{event.type}</span>
                        </div>
                        <p className="text-blue-100/70">{event.description}</p>
                      </div>
                      <Calendar className="text-cyan-400 flex-shrink-0" size={28} />
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-blue-500/20">
                      <div>
                        <p className="text-xs text-blue-200/60">Date</p>
                        <p className="font-semibold">{new Date(event.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200/60">Participants</p>
                        <p className="font-semibold">{event.participants}</p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-200/60">Prize Pool</p>
                        <p className="font-semibold text-emerald-400">{event.prize}</p>
                      </div>
                    </div>
                    <button className="mt-4 w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg font-semibold transition">
                      Learn More
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile overlay when sidebar is open */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default MantleAgenticPortal;