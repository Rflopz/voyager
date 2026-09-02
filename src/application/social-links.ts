import type { SocialNetwork } from '../domain/cv/cv';

/**
 * Pure mapping from a RenderCV social_networks entry to a clickable URL.
 * No I/O — just string composition, kept out of components so the URL
 * scheme for each network lives in exactly one place.
 */
export function buildSocialUrl(social: SocialNetwork): string {
  switch (social.network.toLowerCase()) {
    case 'github':
      return `https://github.com/${social.username}`;
    case 'linkedin':
      return `https://linkedin.com/in/${social.username}`;
    default:
      return '#';
  }
}

export function findSocialUrl(networks: SocialNetwork[], network: string): string {
  const match = networks.find((n) => n.network.toLowerCase() === network.toLowerCase());
  return match ? buildSocialUrl(match) : '#';
}
