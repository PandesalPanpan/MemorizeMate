import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbRepository } from './indexeddb-repository';
import { DEFAULT_SETTINGS, type Deck, type Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function mkDeck(id: string): Deck {
  return { id, name: 'D' + id, description: '', color: 'terracotta', icon: '📘', desiredRetention: 0.9, createdAt: 0 };
}
function mkCard(id: string, deckId: string): Card {
  return { id, deckId, type: 'basic', front: 'q', back: 'a', tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

describe('IndexedDbRepository — remaining gaps', () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = new IndexedDbRepository('gaps-db-' + Math.random());
  });

  it('getSettings migrates legacy reminderHour to reminderMinutes', async () => {
    const db = await (repo as any).dbp;
    await db.put('settings', { theme: 'light', notifications: { reminderHour: 8 } }, 'app');
    const settings = await repo.getSettings();
    expect(settings.notifications.reminderMinutes).toBe(8 * 60);
    expect((settings.notifications as any).reminderHour).toBeUndefined();
  });

  it('getSettings returns default when raw is falsy/undefined', async () => {
    const settings = await repo.getSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('importBackup inserts decks and cards', async () => {
    const decks = [mkDeck('backup-d1'), mkDeck('backup-d2')];
    const cards = [mkCard('backup-c1', 'backup-d1'), mkCard('backup-c2', 'backup-d2')];
    await repo.importBackup(decks, cards);
    expect(await repo.listDecks()).toHaveLength(2);
    expect(await repo.listCards('backup-d1')).toHaveLength(1);
  });
});
