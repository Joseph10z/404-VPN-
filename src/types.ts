/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProtocolId = 'wireguard' | 'openvpn_udp' | 'openvpn_tcp' | 'ikev2' | 'stealth' | 'ssh' | 'v2ray';

export interface VpnProtocol {
  id: ProtocolId;
  name: string;
  shortDesc: string;
  cipher: string;
  keySize: number; // in bits, e.g. 256
  handshake: string;
  hash: string;
  defaultPort: number;
  overheadBytes: number;
  securityRating: number; // 1-5 rating
}

export interface VpnServer {
  id: string;
  country: string;
  city: string;
  flag: string; // Emoji
  ipAddress: string;
  load: number; // percentage (0-100)
  basePing: number; // in ms
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Offshore';
}

export interface TelemetryMetrics {
  ping: number;
  speedDown: number; // Mbps
  speedUp: number; // Mbps
  bytesEncrypted: number;
  bytesDecrypted: number;
  tunnelEfficiency: number; // percentage
  connectedSeconds: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
}
