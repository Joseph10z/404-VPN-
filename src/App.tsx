/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, ShieldAlert, ShieldCheck, Cpu, Database, Network, 
  Settings, Radio, Activity, Terminal, RefreshCw, Sliders, 
  MapPin, Zap, ChevronRight, Check, AlertCircle, Key, Info, 
  HardDrive, Lock, Unlock, HelpCircle, FileText, ToggleLeft, ToggleRight,
  Wifi, Globe, Play, Square, Award, ArrowUpRight, ArrowDownRight, MoreVertical, Copy, Download, Upload, QrCode, Scan, Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProtocolId, VpnProtocol, VpnServer, TelemetryMetrics, LogEntry } from './types';
import { QRCodeSVG } from 'qrcode.react';
import { BrowserQRCodeReader } from '@zxing/browser';

// Constants & Mock Data
const CONFIG_TYPES = [
  { id: 'vmess', name: 'VMess', badge: 'XRAY' },
  { id: 'vless', name: 'VLess', badge: 'XRAY' },
  { id: 'socks', name: 'Socks', badge: 'XRAY' },
  { id: 'trojan', name: 'Trojan', badge: 'XRAY' },
  { id: 'ssr', name: 'ShadowsocksR', badge: 'XRAY' },
  { id: 'ss2022', name: 'Shadowsocks2022', badge: 'XRAY' },
  { id: 'wireguard', name: 'WireGuard', badge: 'XRAY' },
  { id: 'raw_json', name: 'RAW config (JSON)', badge: 'XRAY' },
  { id: 'ssh', name: 'SSH', badge: 'NATIVE' },
  { id: 'dnstt_ssh', name: 'DNSTT + SSH', badge: 'NATIVE' }
];

const PROTOCOLS: VpnProtocol[] = [
  { id: 'wireguard', name: 'WireGuard® v2', shortDesc: 'State-of-the-art cryptography. Max throughput.', cipher: 'ChaCha20', keySize: 256, handshake: 'NoiseIK', hash: 'BLAKE2s', defaultPort: 51820, overheadBytes: 32, securityRating: 5 },
  { id: 'openvpn_udp', name: 'OpenVPN (UDP)', shortDesc: 'Industry gold-standard for streaming.', cipher: 'AES-256-GCM', keySize: 256, handshake: 'ECDH', hash: 'SHA-384', defaultPort: 1194, overheadBytes: 64, securityRating: 5 },
  { id: 'stealth', name: 'Stealth Tunnel', shortDesc: 'Masks VPN signature for deep packet inspection bypass.', cipher: 'Chameleon XOR', keySize: 256, handshake: 'Curve448', hash: 'SHA3-512', defaultPort: 8443, overheadBytes: 128, securityRating: 5 },
  { id: 'v2ray', name: 'V2Ray (VMess)', shortDesc: 'Advanced censorship circumvention framework.', cipher: 'Auto', keySize: 256, handshake: 'VMess', hash: 'MD5', defaultPort: 443, overheadBytes: 80, securityRating: 5 },
  { id: 'ssh', name: 'SSH Tunnel', shortDesc: 'Secure shell dynamic port forwarding.', cipher: 'AES-256-CTR', keySize: 256, handshake: 'RSA/Ed25519', hash: 'SHA-256', defaultPort: 22, overheadBytes: 48, securityRating: 4 }
];

const SERVERS: VpnServer[] = [
  { id: 'is-rey', country: 'Iceland', city: 'Reykjavík', flag: '🇮🇸', ipAddress: '185.112.144.12', load: 14, basePing: 34, region: 'Europe' },
  { id: 'ch-zur', country: 'Switzerland', city: 'Zürich', flag: '🇨🇭', ipAddress: '46.140.95.8', load: 29, basePing: 18, region: 'Europe' },
  { id: 'jp-tok', country: 'Japan', city: 'Tokyo', flag: '🇯🇵', ipAddress: '210.140.10.43', load: 45, basePing: 118, region: 'Asia-Pacific' },
  { id: 'us-sfo', country: 'United States', city: 'Silicon Valley', flag: '🇺🇸', ipAddress: '104.244.72.15', load: 38, basePing: 88, region: 'Americas' },
];

export default function App() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [selectedProtocol, setSelectedProtocol] = useState<VpnProtocol>(PROTOCOLS[0]);
  const [selectedServer, setSelectedServer] = useState<VpnServer>(SERVERS[1]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'protocols' | 'servers' | 'settings' | 'add_config' | 'share_qr' | 'scan_qr'>('dashboard');
  const [dnsLeakProtection, setDnsLeakProtection] = useState<boolean>(true);
  const [killSwitch, setKillSwitch] = useState<boolean>(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [autoConnect, setAutoConnect] = useState<boolean>(() => {
    return localStorage.getItem('pboy_autoconnect') === 'true';
  });
  const [customServers, setCustomServers] = useState<VpnServer[]>([]);
  const [newConfigType, setNewConfigType] = useState<string>('vmess');
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigHost, setNewConfigHost] = useState('');
  const [newConfigPort, setNewConfigPort] = useState('22');
  const [newConfigUser, setNewConfigUser] = useState('');
  const [newConfigPass, setNewConfigPass] = useState('');
  const [newConfigVmess, setNewConfigVmess] = useState('');
  const [qrConfigString, setQrConfigString] = useState('');
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const scannerControlsRef = useRef<any>(null);

  
  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Dynamic Telemetry States
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    ping: 0, speedDown: 0, speedUp: 0, bytesEncrypted: 0, bytesDecrypted: 0, tunnelEfficiency: 100, connectedSeconds: 0
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [
      h > 0 ? String(h).padStart(2, '0') : null,
      String(m).padStart(2, '0'),
      String(s).padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleImportConfig = async () => {
    setIsMenuOpen(false);
    try {
      const text = await navigator.clipboard.readText();
      if (text.includes('vmess://') || text.includes('vless://') || text.includes('ssh://')) {
        showToast("Config imported from clipboard successfully!");
        setSelectedProtocol(text.includes('ssh') ? PROTOCOLS[4] : PROTOCOLS[3]);
      } else {
        showToast("Invalid config format in clipboard.");
      }
    } catch (err) {
      // Fallback for iframe restrictions
      showToast("Config imported successfully! (Mocked)");
      setSelectedProtocol(PROTOCOLS[3]); // Default to v2ray on mock
    }
  };

  const handleExportConfig = async () => {
    setIsMenuOpen(false);
    const mockConfig = `${selectedProtocol.id === 'ssh' ? 'ssh' : 'vmess'}://pboy_proxy_config_a7f92kc84...`;
    try {
      await navigator.clipboard.writeText(mockConfig);
      showToast("Config copied to clipboard!");
    } catch (err) {
      // Fallback
      showToast("Config exported to clipboard! (Mocked)");
    }
  };

  const handleShowQr = () => {
    setIsMenuOpen(false);
    setQrConfigString(`${selectedProtocol.id === 'ssh' ? 'ssh' : 'vmess'}://pboy_proxy_config_${Date.now()}`);
    setActiveTab('share_qr');
  };

  const handleQrScanned = (result: string) => {
    if (result.includes('vmess://') || result.includes('vless://') || result.includes('ssh://')) {
      showToast("Config imported from QR successfully!");
      setSelectedProtocol(result.includes('ssh') ? PROTOCOLS[4] : PROTOCOLS[3]);
      setActiveTab('dashboard');
    } else {
      showToast("Invalid QR config format.");
    }
  };

  const startCameraScan = () => {
    setIsCameraScanning(true);
    setTimeout(() => {
      const codeReader = new BrowserQRCodeReader();
      const videoInput = document.getElementById('qr-video') as HTMLVideoElement;
      if (videoInput) {
        codeReader.decodeFromVideoDevice(undefined, videoInput, (result, err) => {
          if (result) {
            handleQrScanned(result.getText());
            if (scannerControlsRef.current) scannerControlsRef.current.stop();
            setIsCameraScanning(false);
          }
        }).then(controls => {
          scannerControlsRef.current = controls;
        }).catch(err => {
          showToast("Camera access denied or failed.");
          setIsCameraScanning(false);
        });
      }
    }, 100);
  };

  const stopCameraScan = () => {
    if (scannerControlsRef.current) scannerControlsRef.current.stop();
    setIsCameraScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerControlsRef.current) scannerControlsRef.current.stop();
    };
  }, []);

  const handleSaveConfig = () => {
    const newServer: VpnServer = {
      id: `custom-${Date.now()}`,
      country: 'Custom',
      city: newConfigName || 'Custom Node',
      flag: '🔧',
      ipAddress: newConfigHost || '0.0.0.0',
      load: 0,
      basePing: Math.floor(Math.random() * 50) + 10,
      region: 'Americas'
    };
    setCustomServers([...customServers, newServer]);
    setSelectedServer(newServer);
    
    if (newConfigType === 'ssh' || newConfigType === 'dnstt_ssh') {
      setSelectedProtocol(PROTOCOLS.find(p => p.id === 'ssh') || PROTOCOLS[0]);
    } else if (newConfigType === 'wireguard') {
      setSelectedProtocol(PROTOCOLS.find(p => p.id === 'wireguard') || PROTOCOLS[0]);
    } else {
      setSelectedProtocol(PROTOCOLS.find(p => p.id === 'v2ray') || PROTOCOLS[0]);
    }

    // Reset Form
    setNewConfigName('');
    setNewConfigHost('');
    setNewConfigPort('22');
    setNewConfigUser('');
    setNewConfigPass('');
    setNewConfigVmess('');

    showToast("Custom configuration saved!");
    setActiveTab('servers');
  };

  const handleToggleVpn = () => {
    if (isConnected) {
      setIsConnected(false);
      setIsConnecting(false);
      setTelemetry(prev => ({ ...prev, ping: 0, speedDown: 0, speedUp: 0 }));
    } else {
      setIsConnecting(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 25;
        if (progress >= 100) {
          clearInterval(interval);
          setIsConnecting(false);
          setIsConnected(true);
          setTelemetry(prev => ({ ...prev, ping: selectedServer.basePing + Math.floor(Math.random() * 5), speedDown: 145, speedUp: 52, connectedSeconds: 0 }));
        }
      }, 400);
    }
  };

  useEffect(() => {
    localStorage.setItem('pboy_autoconnect', String(autoConnect));
  }, [autoConnect]);

  useEffect(() => {
    if (autoConnect) {
      handleToggleVpn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isConnected) {
      timerRef.current = setInterval(() => {
        setTelemetry(prev => {
          const currentDown = Math.max(25, prev.speedDown + (Math.random() * 10 - 5));
          const currentUp = Math.max(8, prev.speedUp + (Math.random() * 4 - 2));
          return {
            ...prev,
            speedDown: Number(currentDown.toFixed(1)),
            speedUp: Number(currentUp.toFixed(1)),
            connectedSeconds: prev.connectedSeconds + 1
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isConnected]);

  return (
    <div className="min-h-[100dvh] bg-black text-white antialiased font-sans flex flex-col items-center justify-center p-0 md:p-6 overflow-hidden selection:bg-rose-500/30">
      
      {/* Liquid Glass Dynamic Background */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 opacity-60"
        style={{ backgroundImage: "url('/ghost-priest.jpg'), linear-gradient(to bottom, #111, #000)" }}
      />
      <div className="fixed inset-0 z-0 bg-black/40 " />

      {/* Main Fluid Phone View Container - Material 3 Expressive rounding */}
      <div className="w-full h-[100dvh] md:h-[844px] max-w-[400px] border-white/10 md:border md:rounded-[3rem] shadow-2xl relative z-10 flex flex-col  overflow-hidden md:ring-1 ring-white/5 mx-auto bg-black/20">
        
        {/* Glow Effects */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-rose-600/5 rounded-full pointer-events-none" />
        <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-blue-600/5 rounded-full pointer-events-none" />

        {/* Top Header */}
        <header className="px-6 pt-14 pb-4 flex items-center justify-between z-20 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1rem] bg-white/10 border border-white/20 flex items-center justify-center  shadow-xl shadow-black/20 mix-blend-screen">
              <span className="font-display font-black text-base tracking-widest text-white text-shadow">404</span>
            </div>
            <div>
              <h1 className="font-display text-[16px] font-bold tracking-widest text-white uppercase drop-shadow-md">
                404 NOT FOUND
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] ${isConnected ? 'bg-emerald-400' : isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'}`} />
                <p className="text-[10px] text-white/80 font-mono tracking-widest uppercase">
                   {isConnected ? 'Proxy Secure' : isConnecting ? 'Handshake...' : 'Exposed'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/80 hover:text-white  transition-all hover:bg-white/15 cursor-pointer active:scale-95 shadow-xl"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            
            {/* 3-Dot Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-3 w-56 bg-black/60  border border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-40 py-2"
                  >
                    <button onClick={handleImportConfig} className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display">
                      <Download className="w-4 h-4 text-emerald-400" /> Import clipboard
                    </button>
                    <button 
                      onClick={() => { setIsMenuOpen(false); setActiveTab('scan_qr'); }} 
                      className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display"
                    >
                      <Scan className="w-4 h-4 text-amber-400" /> Scan QR Code
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-3" />
                    <button onClick={handleShowQr} className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display">
                      <QrCode className="w-4 h-4 text-emerald-400" /> Share via QR
                    </button>
                    <button onClick={handleExportConfig} className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display">
                      <Upload className="w-4 h-4 text-sky-400" /> Export clipboard
                    </button>
                    <button 
                      onClick={() => { setIsMenuOpen(false); setActiveTab('add_config'); }} 
                      className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display"
                    >
                      <Settings className="w-4 h-4 text-purple-400" /> Add Custom SSH
                    </button>
                    <div className="h-px bg-white/10 my-1 mx-3" />
                    <button 
                      onClick={() => { setIsMenuOpen(false); setActiveTab('settings'); }} 
                      className="w-full px-5 py-3 flex items-center gap-3 text-sm text-left text-white/90 hover:bg-white/10 transition-colors font-display"
                    >
                      <Settings className="w-4 h-4 text-white/60" /> Prefernces
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 px-5 pb-36 overflow-y-auto z-10 relative flex flex-col gap-5 scroll-smooth scrollbar-hide">
          
          <AnimatePresence mode="wait">
            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-5 pb-8"
              >
                {/* Visual Status Hero */}
                <div className="flex flex-col items-center justify-center py-6">
                  <motion.div 
                    animate={isConnected ? { 
                      boxShadow: ['0 0 0px rgba(16, 185, 129, 0)', '0 0 100px rgba(16, 185, 129, 0.5)', '0 0 0px rgba(16, 185, 129, 0)'],
                    } : {}}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="relative w-48 h-48 rounded-[3rem] flex flex-col items-center justify-center bg-white/[0.03] border border-white/10  shadow-2xl"
                  >
                    <Shield className={`w-16 h-16 stroke-[1.5] ${isConnected ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]' : isConnecting ? 'text-amber-400' : 'text-white/30'}`} />
                    <span className="font-mono text-[11px] text-white/60 tracking-[0.2em] mt-4 uppercase font-bold">{isConnected ? 'Encrypted' : 'Standby'}</span>
                    
                    {isConnected && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-emerald-400 font-mono text-xl tracking-wider font-light"
                      >
                        {formatTime(telemetry.connectedSeconds)}
                      </motion.div>
                    )}

                    {isConnecting && (
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="absolute inset-[6px] border-[4px] border-dashed border-amber-500/50 rounded-[2.8rem]"
                      />
                    )}
                  </motion.div>
                </div>

                {/* Expressive Metrics Area */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 border border-white/15 p-4 rounded-3xl relative overflow-hidden shadow-lg shadow-black/20">
                    <div className="absolute top-4 right-4 opacity-40 bg-white/10 p-1.5 rounded-lg">
                      <ArrowDownRight className="w-4 h-4 text-emerald-300" />
                    </div>
                    <p className="text-[10px] font-mono font-medium text-white/70 tracking-widest uppercase">RX / DL</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-display font-medium text-white shadow-sm">
                        {isConnected ? telemetry.speedDown : '0.0'}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono">MB/s</span>
                    </div>
                  </div>

                  <div className="bg-white/10 border border-white/15 p-4 rounded-3xl relative overflow-hidden shadow-lg shadow-black/20">
                    <div className="absolute top-4 right-4 opacity-40 bg-white/10 p-1.5 rounded-lg">
                      <ArrowUpRight className="w-4 h-4 text-sky-300" />
                    </div>
                    <p className="text-[10px] font-mono font-medium text-white/70 tracking-widest uppercase">TX / UP</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl font-display font-medium text-white shadow-sm">
                        {isConnected ? telemetry.speedUp : '0.0'}
                      </span>
                      <span className="text-[10px] text-white/60 font-mono">MB/s</span>
                    </div>
                  </div>
                  
                  {/* Selector Blocks - Material 3 Expressive Tonal Surfaces */}
                  <div className="col-span-2 bg-white/5 hover:bg-white/10  border border-white/15 p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer shadow-xl shadow-black/30 group active:scale-[0.98] transition-all" onClick={() => setActiveTab('protocols')}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/10 shadow-inner group-hover:bg-white/20 transition-colors">
                        <Lock className="w-6 h-6 text-white/90" />
                      </div>
                      <div>
                        <p className="text-[11px] font-mono font-bold text-white/50 tracking-widest uppercase mb-0.5">Proxy Engine</p>
                        <p className="text-[16px] font-display font-medium text-white">{selectedProtocol.name}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white/80 transition-colors" />
                  </div>

                  <div className="col-span-2 bg-white/5 hover:bg-white/10  border border-white/15 p-5 rounded-[2.5rem] flex items-center justify-between cursor-pointer shadow-xl shadow-black/30 group active:scale-[0.98] transition-all" onClick={() => setActiveTab('servers')}>
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/10 text-3xl shadow-inner group-hover:bg-white/20 transition-colors">
                        {selectedServer.flag}
                      </div>
                      <div>
                        <p className="text-[11px] font-mono font-bold text-white/50 tracking-widest uppercase mb-0.5">Exit Node</p>
                        <p className="text-[16px] font-display font-medium text-white">{selectedServer.city}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white/80 transition-colors" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Protocols Tab */}
            {activeTab === 'protocols' && (
              <motion.div 
                key="protocols"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setActiveTab('dashboard')} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center  border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Protocols</h2>
                </div>
                {PROTOCOLS.map((protocol) => {
                  const isSelected = selectedProtocol.id === protocol.id;
                  return (
                    <div 
                      key={protocol.id}
                      className={`p-6 rounded-[2.5rem] border transition-all cursor-pointer  ${
                        isSelected 
                          ? 'bg-emerald-500/10 border-emerald-400/40 shadow-[0_4px_30px_rgba(16,185,129,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/15'
                      }`}
                      onClick={() => setSelectedProtocol(protocol)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[16px] font-display font-medium text-white">{protocol.name}</h3>
                        {isSelected && <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center border border-emerald-400/50"><Check className="w-4 h-4 text-emerald-400" /></div>}
                      </div>
                      <p className="text-[13px] text-white/70 leading-relaxed font-sans">{protocol.shortDesc}</p>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Servers Tab */}
            {activeTab === 'servers' && (
              <motion.div 
                key="servers"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setActiveTab('dashboard')} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center  border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Nodes</h2>
                </div>
                {[...SERVERS, ...customServers].map((server) => {
                  const isSelected = selectedServer.id === server.id;
                  return (
                    <div 
                      key={server.id}
                      onClick={() => setSelectedServer(server)}
                      className={`p-5 rounded-[2.5rem] border transition-all cursor-pointer  flex items-center justify-between ${
                        isSelected 
                          ? 'bg-sky-500/10 border-sky-400/40 shadow-[0_4px_30px_rgba(14,165,233,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/10 text-3xl shadow-inner">
                          {server.flag}
                        </div>
                        <div>
                          <h3 className="text-[16px] font-display font-medium text-white mb-0.5">{server.city}</h3>
                          <p className="text-[12px] font-mono text-white/60">{server.basePing} ms latency</p>
                        </div>
                      </div>
                      {isSelected && <div className="w-4 h-4 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.8)]" />}
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setActiveTab('dashboard')} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center  border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Preferences</h2>
                </div>
                
                <div className="bg-white/5  border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl">
                  <div>
                    <h4 className="text-[15px] font-display font-medium text-white mb-1">Kill Switch</h4>
                    <p className="text-[12px] text-white/50 font-mono">Block traffic on disconnect</p>
                  </div>
                  <button onClick={() => setKillSwitch(!killSwitch)}>
                    {killSwitch ? <ToggleRight className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <ToggleLeft className="w-10 h-10 text-white/30" />}
                  </button>
                </div>

                <div className="bg-white/5  border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl">
                  <div>
                    <h4 className="text-[15px] font-display font-medium text-white mb-1">Secure DNS</h4>
                    <p className="text-[12px] text-white/50 font-mono">Prevent query leaks</p>
                  </div>
                  <button onClick={() => setDnsLeakProtection(!dnsLeakProtection)}>
                    {dnsLeakProtection ? <ToggleRight className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <ToggleLeft className="w-10 h-10 text-white/30" />}
                  </button>
                </div>

                <div className="bg-white/5  border border-white/10 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl">
                  <div>
                    <h4 className="text-[15px] font-display font-medium text-white mb-1">Auto-Connect</h4>
                    <p className="text-[12px] text-white/50 font-mono">Connect on app launch</p>
                  </div>
                  <button onClick={() => setAutoConnect(!autoConnect)}>
                    {autoConnect ? <ToggleRight className="w-10 h-10 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> : <ToggleLeft className="w-10 h-10 text-white/30" />}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Add Custom Config Tab */}
            {activeTab === 'add_config' && (
              <motion.div 
                key="add_config"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setActiveTab('dashboard')} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center  border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Add Config</h2>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-5 rounded-[2.5rem] flex flex-col gap-4 shadow-xl">
                  
                  <div>
                    <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Protocol Type</label>
                    <div className="relative">
                      <select
                        className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none appearance-none font-display"
                        value={newConfigType}
                        onChange={(e) => setNewConfigType(e.target.value)}
                      >
                        {CONFIG_TYPES.map(type => (
                          <option key={type.id} value={type.id} className="bg-slate-900 text-white">
                            {type.name} ({type.badge})
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-white/50 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Alias / Name</label>
                    <input 
                      type="text"
                      className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. My Private Box"
                      value={newConfigName}
                      onChange={(e) => setNewConfigName(e.target.value)}
                    />
                  </div>

                  {newConfigType === 'ssh' || newConfigType === 'dnstt_ssh' ? (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Host / IP</label>
                          <input 
                            type="text"
                            className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                            placeholder="192.168.1.1"
                            value={newConfigHost}
                            onChange={(e) => setNewConfigHost(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Port</label>
                          <input 
                            type="text"
                            className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                            placeholder="22"
                            value={newConfigPort}
                            onChange={(e) => setNewConfigPort(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Username</label>
                        <input 
                          type="text"
                          className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                          placeholder="root"
                          value={newConfigUser}
                          onChange={(e) => setNewConfigUser(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Password / Key</label>
                        <input 
                          type="password"
                          className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                          placeholder="••••••••"
                          value={newConfigPass}
                          onChange={(e) => setNewConfigPass(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[11px] font-mono font-medium text-white/50 tracking-widest uppercase ml-2 block mb-1">Config / URI</label>
                      <textarea 
                        className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 min-h-[100px] resize-none"
                        placeholder={`${newConfigType}://...`}
                        value={newConfigVmess}
                        onChange={(e) => setNewConfigVmess(e.target.value)}
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleSaveConfig}
                    className="w-full mt-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 py-3 rounded-2xl font-display font-medium transition-all"
                  >
                    Save Configuration
                  </button>

                </div>

              </motion.div>
            )}

            {/* Share QR Tab */}
            {activeTab === 'share_qr' && (
              <motion.div 
                key="share_qr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center gap-4 mb-3">
                  <button onClick={() => setActiveTab('dashboard')} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center  border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Share QR</h2>
                </div>
                
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-xl text-center">
                  <div className="bg-white p-4 rounded-3xl">
                    <QRCodeSVG value={qrConfigString} size={200} />
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-white mb-2">Scan to Connect</h3>
                    <p className="text-sm font-mono text-white/50">Point your camera at this code<br/>to import the current node configuration.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Scan QR Tab */}
            {activeTab === 'scan_qr' && (
              <motion.div 
                key="scan_qr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4 h-full relative"
              >
                <div className="flex items-center gap-4 mb-3 z-10 relative">
                  <button onClick={() => { setActiveTab('dashboard'); stopCameraScan(); }} className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                  <h2 className="text-base font-display font-semibold text-white uppercase tracking-[0.15em]">Scan QR</h2>
                </div>
                
                <div className="bg-black/40 border border-white/10 p-4 rounded-[2.5rem] flex flex-col items-center gap-6 shadow-xl flex-1 relative overflow-hidden">
                  
                  <div className="relative w-full aspect-square bg-black/60 rounded-3xl overflow-hidden mt-4 flex items-center justify-center border border-white/5">
                    <video 
                      id="qr-video" 
                      className={`w-full h-full object-cover ${!isCameraScanning ? 'hidden' : ''}`}
                    ></video>
                    
                    {!isCameraScanning && (
                      <div className="flex flex-col items-center text-white/30 gap-4">
                        <Camera className="w-12 h-12" />
                        <span className="font-mono text-xs uppercase tracking-widest">Camera Ready</span>
                      </div>
                    )}
                    
                    {/* Scanner Overlay UI */}
                    <div className="absolute inset-x-8 top-1/2 -mt-[1px] h-[2px] bg-emerald-400 shadow-[0_0_15px_rgba(16,185,129,1)] z-10 animate-pulse origin-center" />
                    <div className="absolute inset-4 rounded-2xl border-2 border-white/20 border-dashed pointer-events-none" />
                  </div>

                  {!isCameraScanning ? (
                    <button 
                      onClick={startCameraScan}
                      className="w-full mt-auto bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-400 py-4 rounded-2xl font-display font-medium transition-all"
                    >
                      Start Camera Scan
                    </button>
                  ) : (
                    <button 
                      onClick={stopCameraScan}
                      className="w-full mt-auto bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-400 py-4 rounded-2xl font-display font-medium transition-all"
                    >
                      Cancel
                    </button>
                  )}
                  
                  {/* File fallback could go here if needed, but per request scan via camera adds full app feel */}
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
          
        </main>

        {/* Liquid Glass Floating Master Toggle Button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[88%] max-w-[360px] z-50">
          <div className="relative">
             {/* Dynamic Expressive Glow */}
            <div className={`absolute -inset-2  opacity-50 rounded-full transition-colors duration-1000 ${
              isConnected ? 'bg-emerald-500' : isConnecting ? 'bg-amber-500' : 'bg-rose-600'
            }`} />
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggleVpn}
              disabled={isConnecting}
              className={`relative w-full overflow-hidden rounded-[3rem] flex items-center justify-center gap-3 py-6 transition-all duration-700 border  shadow-[0_8px_32px_rgba(0,0,0,0.5)] ${
                isConnected 
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-white' 
                  : isConnecting
                    ? 'bg-amber-500/20 border-amber-400/50 text-white'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
              }`}
            >
              {/* Glass sheen */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-white/10 pointer-events-none" />
              
              {isConnected ? (
                <Lock className="w-6 h-6 text-emerald-300 drop-shadow-md z-10" />
              ) : isConnecting ? (
                <RefreshCw className="w-6 h-6 animate-spin text-amber-300 drop-shadow-md z-10" />
              ) : (
                <Zap className="w-6 h-6 text-white drop-shadow-md z-10" />
              )}
              <span className="font-display font-medium tracking-[0.2em] text-[15px] uppercase drop-shadow-md z-10">
                {isConnected ? 'Disconnect' : isConnecting ? 'Connecting' : '4o4 Connect His Voice'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 bg-black/80  border border-white/20 text-white text-sm font-display px-6 py-3 rounded-full shadow-2xl whitespace-nowrap"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
