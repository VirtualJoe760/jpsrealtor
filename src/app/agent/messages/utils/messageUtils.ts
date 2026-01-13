/**
 * Message utility functions
 */

import { SMSMessage, Conversation } from '../types';

export const OPT_IN_TEMPLATE = `Hey this is Joseph Sardella, Your trusted real estate agent! Type "OPT IN" to receive text alerts from me, features like updates on new listings that come on the market, nearby open houses, and much more. Type "STOP" to stop getting messages.`;

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

export function playNotificationSound(): void {
  try {
    // Create a pleasant notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Two-tone notification sound
    oscillator.frequency.value = 800;
    gainNode.gain.value = 0.3;
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);

    setTimeout(() => {
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.value = 1000;
      gainNode2.gain.value = 0.3;
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 0.1);
    }, 100);
  } catch (error) {
    console.error('[Notification] Error playing sound:', error);
  }
}

export async function showBrowserNotification(
  message: SMSMessage,
  conversations: Conversation[]
): Promise<void> {
  // Request permission if not granted
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    try {
      const contactName = conversations.find(c => c.phoneNumber === message.from)?.contactName || 'Unknown Contact';
      const notification = new Notification('New SMS Message', {
        body: `${contactName}: ${message.body.substring(0, 100)}${message.body.length > 100 ? '...' : ''}`,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: message._id,
        requireInteraction: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('[Notification] Error showing notification:', error);
    }
  }
}
