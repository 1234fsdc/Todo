const Storage = require('../../utils/storage');

Page({
  data: {
    notes: [],
    categories: [],
    currentCategory: '全部',
    showSearch: false,
    searchKeyword: '',
    darkMode: false
  },

  onLoad() {
    this.loadCategories();
    this.loadNotes();
    this.loadDarkMode();
  },

  onShow() {
    this.loadNotes();
    this.loadDarkMode();
  },

  loadDarkMode() {
    const app = getApp();
    this.setData({ darkMode: app.globalData.darkMode });
  },

  loadCategories() {
    const categories = Storage.getCategories();
    this.setData({ categories });
  },

  loadNotes() {
    const { currentCategory, searchKeyword } = this.data;
    let notes;

    if (searchKeyword.trim()) {
      notes = Storage.searchNotes(searchKeyword);
    } else {
      notes = Storage.filterNotesByCategory(currentCategory);
    }

    const formattedNotes = notes.map(note => ({
      ...note,
      title: note.title.length > 20 ? note.title.substring(0, 20) + '...' : note.title,
      content: note.content.length > 50 ? note.content.substring(0, 50) + '...' : note.content,
      formattedTime: Storage.formatTime(note.updateTime)
    }));

    this.setData({ notes: formattedNotes });
  },

  onCategoryChange(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ 
      currentCategory: category,
      searchKeyword: '',
      showSearch: false
    }, () => {
      this.loadNotes();
    });
  },

  toggleSearch() {
    this.setData({ showSearch: !this.data.showSearch });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onSearch() {
    this.loadNotes();
  },

  cancelSearch() {
    this.setData({ 
      showSearch: false,
      searchKeyword: ''
    }, () => {
      this.loadNotes();
    });
  },

  addNote() {
    wx.navigateTo({
      url: '/pages/notes/edit'
    });
  },

  editNote(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/notes/edit?id=${id}`
    });
  },

  togglePin(e) {
    const id = e.currentTarget.dataset.id;
    Storage.togglePinNote(id);
    this.loadNotes();
  }
});
