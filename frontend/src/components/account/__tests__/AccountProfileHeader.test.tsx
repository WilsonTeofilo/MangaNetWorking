import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { AccountProfileHeader } from '../AccountProfileHeader';
import { UserProfile } from '../../../types';

const mockUser: UserProfile = {
  uid: 'user-123',
  name: 'Teófilo Leitor',
  email: 'teofilo@example.com',
  username: 'teofilo',
  avatarUrl: '/avatar.png',
  isCreator: false,
  isModerator: false,
  isOwner: false,
  isVip: true,
  activeMemberships: {},
  favorites: ['work-1', 'work-2'],
};

describe('AccountProfileHeader', () => {
  it('renders user details, official reader badge and VIP indicator', () => {
    const html = renderToString(
      <AccountProfileHeader
        user={mockUser}
        avatarUrl="/avatar.png"
        activeTab="collection"
        onTabChange={() => {}}
        onPickAvatar={() => {}}
        uploading={false}
      />
    );

    expect(html).toContain('Teófilo Leitor');
    expect(html).toContain('@teofilo');
    expect(html).toContain('LEITOR OFICIAL');
    expect(html).toContain('VIP');
  });

  it('renders both navigation tabs: MINHA COLEÇÃO and SEGURANÇA & DADOS', () => {
    const html = renderToString(
      <AccountProfileHeader
        user={mockUser}
        avatarUrl="/avatar.png"
        activeTab="collection"
        onTabChange={() => {}}
        onPickAvatar={() => {}}
        uploading={false}
      />
    );

    expect(html).toContain('MINHA COLEÇÃO');
    expect(html).toContain('SEGURANÇA &amp; DADOS');
  });

  it('highlights the active tab with yellow tokens', () => {
    const htmlCollection = renderToString(
      <AccountProfileHeader
        user={mockUser}
        avatarUrl="/avatar.png"
        activeTab="collection"
        onTabChange={() => {}}
        onPickAvatar={() => {}}
        uploading={false}
      />
    );

    expect(htmlCollection).toContain('bg-[var(--mn-yellow)] text-[var(--mn-ink)]');

    const htmlSecurity = renderToString(
      <AccountProfileHeader
        user={mockUser}
        avatarUrl="/avatar.png"
        activeTab="security"
        onTabChange={() => {}}
        onPickAvatar={() => {}}
        uploading={false}
      />
    );

    expect(htmlSecurity).toContain('bg-[var(--mn-yellow)] text-[var(--mn-ink)]');
  });

  it('does NOT contain obsolete button "MEU PAINEL DE LEITOR"', () => {
    const html = renderToString(
      <AccountProfileHeader
        user={mockUser}
        avatarUrl="/avatar.png"
        activeTab="collection"
        onTabChange={() => {}}
        onPickAvatar={() => {}}
        uploading={false}
      />
    );

    expect(html).not.toContain('MEU PAINEL DE LEITOR');
  });
});
