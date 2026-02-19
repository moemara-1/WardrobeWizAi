import { generateId, useClosetStore } from '@/stores/closetStore';
import { ClosetItem, Outfit } from '@/types';
import { act } from '@testing-library/react-native';

// Reset store between tests
beforeEach(() => {
  act(() => {
    useClosetStore.setState({
      items: [],
      outfits: [],
      selectedItem: null,
      selectedOutfit: null,
      digitalTwin: null,
      searchQuery: '',
      categoryFilter: null,
      colorFilter: null,
      isLoading: false,
      error: null,
      twinGenerating: false,
      twinProgress: null,
    });
  });
});

function makeItem(overrides: Partial<ClosetItem> = {}): ClosetItem {
  return {
    id: generateId('test'),
    user_id: 'demo',
    image_url: 'https://example.com/image.jpg',
    name: 'Test Item',
    category: 'top',
    colors: ['black'],
    detected_confidence: 0.95,
    tags: ['casual'],
    wear_count: 0,
    favorite: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeOutfit(overrides: Partial<Outfit> = {}): Outfit {
  return {
    id: generateId('outfit'),
    user_id: 'demo',
    items: [],
    item_ids: [],
    name: 'Test Outfit',
    seasons: ['spring'],
    pinned: false,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── generateId ───

describe('generateId', () => {
  it('generates unique UUIDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

// ─── Item CRUD ───

describe('Item CRUD', () => {
  it('starts with empty items', () => {
    expect(useClosetStore.getState().items).toEqual([]);
  });

  it('adds an item (prepends to list)', () => {
    const item1 = makeItem({ name: 'First' });
    const item2 = makeItem({ name: 'Second' });

    act(() => {
      useClosetStore.getState().addItem(item1);
      useClosetStore.getState().addItem(item2);
    });

    const { items } = useClosetStore.getState();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Second'); // prepended
    expect(items[1].name).toBe('First');
  });

  it('updates an item by id and refreshes updated_at', () => {
    const item = makeItem({ name: 'Original', updated_at: '2020-01-01T00:00:00.000Z' });

    act(() => {
      useClosetStore.getState().addItem(item);
      useClosetStore.getState().updateItem(item.id, { name: 'Updated' });
    });

    const { items } = useClosetStore.getState();
    expect(items[0].name).toBe('Updated');
    expect(items[0].updated_at).not.toBe('2020-01-01T00:00:00.000Z');
  });

  it('updates selectedItem when the selected item is updated', () => {
    const item = makeItem({ name: 'Selected' });

    act(() => {
      useClosetStore.getState().addItem(item);
      useClosetStore.getState().selectItem(item);
      useClosetStore.getState().updateItem(item.id, { name: 'Changed' });
    });

    expect(useClosetStore.getState().selectedItem?.name).toBe('Changed');
  });

  it('does not update selectedItem when a different item is updated', () => {
    const item1 = makeItem({ id: 'item-1', name: 'Selected' });
    const item2 = makeItem({ id: 'item-2', name: 'Other' });

    act(() => {
      useClosetStore.getState().addItem(item1);
      useClosetStore.getState().addItem(item2);
      useClosetStore.getState().selectItem(item1);
      useClosetStore.getState().updateItem(item2.id, { name: 'Changed' });
    });

    expect(useClosetStore.getState().selectedItem?.name).toBe('Selected');
  });

  it('deletes an item by id', () => {
    const item = makeItem();

    act(() => {
      useClosetStore.getState().addItem(item);
      useClosetStore.getState().deleteItem(item.id);
    });

    expect(useClosetStore.getState().items).toHaveLength(0);
  });

  it('clears selectedItem when the selected item is deleted', () => {
    const item = makeItem();

    act(() => {
      useClosetStore.getState().addItem(item);
      useClosetStore.getState().selectItem(item);
      useClosetStore.getState().deleteItem(item.id);
    });

    expect(useClosetStore.getState().selectedItem).toBeNull();
  });

  it('setItems replaces all items', () => {
    const existing = makeItem({ name: 'Old' });
    const newItems = [makeItem({ name: 'A' }), makeItem({ name: 'B' })];

    act(() => {
      useClosetStore.getState().addItem(existing);
      useClosetStore.getState().setItems(newItems);
    });

    const { items } = useClosetStore.getState();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('A');
  });
});

// ─── Outfit CRUD ───

describe('Outfit CRUD', () => {
  it('adds an outfit (prepends)', () => {
    const outfit1 = makeOutfit({ name: 'First' });
    const outfit2 = makeOutfit({ name: 'Second' });

    act(() => {
      useClosetStore.getState().addOutfit(outfit1);
      useClosetStore.getState().addOutfit(outfit2);
    });

    const { outfits } = useClosetStore.getState();
    expect(outfits).toHaveLength(2);
    expect(outfits[0].name).toBe('Second');
  });

  it('deletes an outfit by id', () => {
    const outfit = makeOutfit();

    act(() => {
      useClosetStore.getState().addOutfit(outfit);
      useClosetStore.getState().deleteOutfit(outfit.id);
    });

    expect(useClosetStore.getState().outfits).toHaveLength(0);
  });
});

// ─── Filters ───

describe('Filters', () => {
  it('filters by search query (name)', () => {
    act(() => {
      useClosetStore.getState().addItem(makeItem({ name: 'Blue Denim Jacket' }));
      useClosetStore.getState().addItem(makeItem({ name: 'White T-Shirt' }));
      useClosetStore.getState().setSearchQuery('denim');
    });

    // useFilteredItems is a hook — test the logic directly
    const { items, searchQuery, categoryFilter, colorFilter } = useClosetStore.getState();
    const filtered = items.filter((item) => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Blue Denim Jacket');
  });

  it('filters by category', () => {
    act(() => {
      useClosetStore.getState().addItem(makeItem({ name: 'Jacket', category: 'outerwear' }));
      useClosetStore.getState().addItem(makeItem({ name: 'Shirt', category: 'top' }));
      useClosetStore.getState().addItem(makeItem({ name: 'Pants', category: 'bottom' }));
      useClosetStore.getState().setCategoryFilter('top');
    });

    const { items, categoryFilter } = useClosetStore.getState();
    const filtered = items.filter((item) => !categoryFilter || item.category === categoryFilter);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Shirt');
  });

  it('filters by color', () => {
    act(() => {
      useClosetStore.getState().addItem(makeItem({ name: 'Red Dress', colors: ['red', 'crimson'] }));
      useClosetStore.getState().addItem(makeItem({ name: 'Blue Shirt', colors: ['navy', 'blue'] }));
      useClosetStore.getState().setColorFilter('red');
    });

    const { items, colorFilter } = useClosetStore.getState();
    const filtered = items.filter((item) =>
      !colorFilter || item.colors.some(c => c.toLowerCase().includes(colorFilter!.toLowerCase()))
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Red Dress');
  });

  it('clearFilters resets all filters', () => {
    act(() => {
      useClosetStore.getState().setSearchQuery('test');
      useClosetStore.getState().setCategoryFilter('top');
      useClosetStore.getState().setColorFilter('red');
      useClosetStore.getState().clearFilters();
    });

    const { searchQuery, categoryFilter, colorFilter } = useClosetStore.getState();
    expect(searchQuery).toBe('');
    expect(categoryFilter).toBeNull();
    expect(colorFilter).toBeNull();
  });
});

// ─── Digital Twin ───

describe('Digital Twin', () => {
  it('sets and clears digital twin', () => {
    const twin = {
      id: 'twin_1',
      user_id: 'demo',
      selfie_url: 'file://selfie.jpg',
      skin_color: 'light',
      hair_color: 'brown',
      ai_description: 'Test description',
      body_type: 'athletic',
      style_recommendations: 'Wear fitted clothes',
      twin_image_url: 'file://twin.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    act(() => {
      useClosetStore.getState().setDigitalTwin(twin);
    });
    expect(useClosetStore.getState().digitalTwin).toEqual(twin);

    act(() => {
      useClosetStore.getState().clearDigitalTwin();
    });
    expect(useClosetStore.getState().digitalTwin).toBeNull();
  });

  it('tracks twin generating state', () => {
    act(() => {
      useClosetStore.getState().setTwinGenerating(true);
      useClosetStore.getState().setTwinProgress('Analyzing selfie...');
    });

    expect(useClosetStore.getState().twinGenerating).toBe(true);
    expect(useClosetStore.getState().twinProgress).toBe('Analyzing selfie...');

    act(() => {
      useClosetStore.getState().setTwinGenerating(false);
      useClosetStore.getState().setTwinProgress(null);
    });

    expect(useClosetStore.getState().twinGenerating).toBe(false);
    expect(useClosetStore.getState().twinProgress).toBeNull();
  });
});

// ─── UI State ───

describe('UI State', () => {
  it('sets loading and error', () => {
    act(() => {
      useClosetStore.getState().setLoading(true);
      useClosetStore.getState().setError('Something failed');
    });

    expect(useClosetStore.getState().isLoading).toBe(true);
    expect(useClosetStore.getState().error).toBe('Something failed');
  });
});
