// ==========================================
// Kitchen Expense Tracker - Internationalization (i18n) Module
// Supports English & Urdu (اردو) with instant 0ms switching
// ==========================================

const I18n = {
  currentLang: localStorage.getItem('kitchen_lang') || 'en',

  isUrdu() {
    return this.currentLang === 'ur';
  },

  // Dictionary of Category Translations (English -> Urdu)
  categoriesUrdu: {
    'vegetables': 'سبزیاں',
    'milk - cheese - khoya': 'دودھ - پنیر - کھویا',
    'dairy': 'دودھ - پنیر - کھویا',
    'meat/chicken': 'گوشت و مرغی',
    'meat': 'گوشت و مرغی',
    'chicken': 'گوشت و مرغی',
    'oil/ghee': 'تیل و گھی',
    'oil & ghee': 'تیل و گھی',
    'packing': 'پیکنگ',
    'packaging': 'پیکنگ',
    'spices': 'مصالحہ جات'
  },

  // Units Translation
  units: {
    'en': {
      '': 'No Unit',
      'kg': 'kg (Kilogram)',
      'litre': 'litre (L)',
      'pcs': 'pcs (Pieces)',
      'packet': 'packet',
      'dozen': 'dozen',
      'box': 'box / carton',
      'gm': 'gram (g)',
      'ml': 'millilitre (ml)'
    },
    'ur': {
      '': 'بغیر یونٹ',
      'kg': 'کلو (کلوگرام)',
      'litre': 'لیٹر',
      'pcs': 'عدد (پیس)',
      'packet': 'پیکٹ',
      'dozen': 'درجن',
      'box': 'ڈبہ / کارٹن',
      'gm': 'گرام',
      'ml': 'ملی لیٹر'
    }
  },

  // Master Translation Dictionary
  translations: {
    // Header & Brand
    'app_title': { en: 'Cloud Kitchen', ur: 'کلاؤڈ کچن' },
    'live_tracker': { en: 'Live Tracker', ur: 'لائیو ٹریکر' },
    'kitchen_tracker': { en: 'Kitchen Tracker', ur: 'کچن خرچہ ٹریکر' },
    'lock_screen': { en: 'Lock Screen', ur: 'اسکرین لاک کریں' },
    'theme_light': { en: 'Theme: Light', ur: 'تھیم: لائٹ' },
    'theme_dark': { en: 'Theme: Dark', ur: 'تھیم: ڈارک' },
    'lang_toggle_btn': { en: 'اردو', ur: 'English' },
    'lang_label': { en: 'Language: English', ur: 'زبان: اردو' },

    // Tabs
    'tab_dashboard': { en: 'Dashboard', ur: 'ڈیش بورڈ' },
    'tab_expenses': { en: 'Expenses', ur: 'اخراجات' },
    'tab_payouts': { en: 'Payouts & P&L', ur: 'آمدنی و منافع' },
    'tab_categories': { en: 'Categories', ur: 'کیٹیگریز' },
    'tab_settings': { en: 'Settings', ur: 'سیٹنگز' },

    // Period Filter Bar
    'period_today': { en: 'Today', ur: 'آج' },
    'period_week': { en: 'This Week', ur: 'اس ہفتے' },
    'period_month': { en: 'This Month', ur: 'اس مہینے' },
    'period_custom': { en: 'Custom', ur: 'مخصوص تاریخ' },
    'date_from': { en: 'From:', ur: 'شروع تاریخ:' },
    'date_to': { en: 'To:', ur: 'آخری تاریخ:' },
    'btn_apply': { en: 'Apply', ur: 'لاگو کریں' },
    'add_expense': { en: 'Add Expense', ur: '+ نیا خرچہ' },

    // Dashboard Cards
    'kpi_total_spent': { en: 'Total Spent', ur: 'کل خرچ' },
    'kpi_payouts_received': { en: 'Payouts Received', ur: 'موصول آمدنی' },
    'kpi_net_profit': { en: 'Net Profit / Loss', ur: 'خالص منافع / نقصان' },
    'kpi_daily_avg': { en: 'Daily Average', ur: 'روزانہ اوسط خرچ' },
    'kpi_for_this_cycle': { en: 'For this cycle', ur: 'اس مدت کے دوران' },
    'kpi_payout_minus_expenses': { en: 'Payout minus expenses', ur: 'آمدنی منفی اخراجات' },
    'kpi_per_shopping_day': { en: 'Per shopping day', ur: 'فی خریداری دن' },
    'kpi_profit_margin': { en: 'profit margin', ur: 'منافع' },
    'kpi_deficit': { en: 'Deficit for period', ur: 'اس مدت میں نقصان' },
    'kpi_no_payout': { en: 'No Payout Yet', ur: 'ابھی کوئی آمدنی نہیں' },
    'kpi_record_payout_hint': { en: 'Record a payout to track P&L', ur: 'آمدنی درج کریں تاکہ منافع معلوم ہو' },
    'purchases_recorded': { en: 'purchases recorded', ur: 'خریداریاں درج ہوئیں' },

    // Charts & Activity
    'card_cat_breakdown': { en: 'Category Breakdown', ur: 'کیٹیگری کے لحاظ سے خرچ' },
    'card_spending_trend': { en: 'Daily Spending Trend', ur: 'روزانہ خرچ کا رجحان' },
    'card_recent_purchases': { en: 'Recent Purchases', ur: 'حالیہ خریداریاں' },
    'btn_view_all': { en: 'View All', ur: 'تمام دیکھیں' },
    'expenses_per_day': { en: 'Expenses per day', ur: 'روزانہ اخراجات' },
    'no_expenses_period': { en: 'No Expenses in this Period', ur: 'اس مدت میں کوئی خرچہ نہیں ہے' },
    'no_expenses_period_desc': { en: 'Add your first kitchen grocery purchase to see category distribution.', ur: 'کیٹیگری کا جائزہ دیکھنے کے لیے اپنی پہلی خریداری درج کریں۔' },
    'categories_count_badge': { en: 'categories', ur: 'کیٹیگریز' },

    // Expenses Tab
    'search_placeholder': { en: 'Search item, vendor, or note...', ur: 'چیز کا نام، دکان یا نوٹ تلاش کریں...' },
    'all_categories': { en: 'All Categories', ur: 'تمام کیٹیگریز' },
    'export_csv': { en: 'Export CSV', ur: 'ایکسپورٹ CSV' },
    'showing_label': { en: 'Showing', ur: 'دکھائے جا رہے ہیں:' },
    'total_label': { en: 'Total:', ur: 'کل رقم:' },
    'expenses_label': { en: 'expenses', ur: 'اخراجات' },
    'no_expenses_found': { en: 'No expenses found', ur: 'کوئی خرچہ نہیں ملا' },
    'no_expenses_hint': { en: 'Try adjusting filters or tap + Add Expense', ur: 'فلٹر تبدیل کریں یا + نیا خرچہ پر کلک کریں' },
    'th_actions': { en: 'Actions', ur: 'اختیارات' },

    // Expense Form Modal
    'modal_add_expense_title': { en: 'Add Expense', ur: 'نیا خرچہ درج کریں' },
    'modal_edit_expense_title': { en: 'Edit Expense', ur: 'خرچہ تبدیل کریں' },
    'form_date': { en: 'Date', ur: 'تاریخ' },
    'form_category': { en: 'Category', ur: 'کیٹیگری' },
    'form_item_name': { en: 'Item / Detail', ur: 'چیز / تفصیل' },
    'form_item_placeholder': { en: 'Defaults to category name...', ur: 'خالی چھوڑنے پر کیٹیگری کا نام آئے گا...' },
    'form_amount': { en: 'Amount', ur: 'رقم' },
    'form_quantity': { en: 'Quantity', ur: 'مقدار' },
    'form_unit': { en: 'Unit', ur: 'اکائی (یونٹ)' },
    'form_vendor': { en: 'Vendor / Shop', ur: 'دکان / وینڈر' },
    'form_vendor_placeholder': { en: 'e.g. Sabzi Mandi, Meat Shop, Metro', ur: 'مثلاً: سبزی منڈی، گوشت کی دکان، میٹرو، راشن اسٹور' },
    'form_notes': { en: 'Note', ur: 'نوٹ / تفصیل' },
    'form_notes_placeholder': { en: 'e.g. Delivery included, wholesale price', ur: 'مثلاً: ہوم ڈیلیوری، تھوک ریٹ، ادھار' },
    'suggestions_label': { en: 'Suggestions:', ur: 'عام اشیاء (کلک کریں):' },
    'optional_label': { en: '(Optional)', ur: '(اختیاری)' },
    'btn_cancel': { en: 'Cancel', ur: 'منسوخ' },
    'btn_save_expense': { en: 'Add Expense', ur: 'خرچہ محفوظ کریں' },
    'btn_update_expense': { en: 'Update Expense', ur: 'تبدیلی محفوظ کریں' },

    // Payouts Tab
    'payouts_title': { en: 'Payouts & Profit Comparison', ur: 'آمدنی اور منافع کا حساب' },
    'payouts_desc': { en: 'Track weekly / bi-weekly payments received from delivery channels and automatically compare against grocery costs incurred during that exact date period.', ur: 'ڈیلیوری چینلز یا آرڈرز سے ملنے والی رقم درج کریں اور اس تاریخ کے سودا سلف کے خرچ کے مقابلے میں خالص منافع دیکھیں۔' },
    'btn_record_payout': { en: 'Record Payout', ur: '+ نئی آمدنی درج کریں' },
    'modal_record_payout_title': { en: 'Record Payout', ur: 'نئی آمدنی درج کریں' },
    'modal_edit_payout_title': { en: 'Edit Payout', ur: 'آمدنی تبدیل کریں' },
    'form_payout_date': { en: 'Payout Date', ur: 'آمدنی ملنے کی تاریخ' },
    'form_payout_amount': { en: 'Payout Amount', ur: 'آمدنی کی رقم' },
    'form_period_covered': { en: 'Period Covered (1-2 Weeks)', ur: 'مدت (شروع سے آخری تاریخ)' },
    'form_period_hint': { en: 'Expenses in this window are automatically subtracted to reveal your net profit.', ur: 'اس مدت کے اخراجات خود بخود منہا کر کے خالص منافع کا حساب لگایا جائے گا۔' },
    'form_start_date': { en: 'Start Date', ur: 'شروع تاریخ' },
    'form_end_date': { en: 'End Date', ur: 'آخری تاریخ' },
    'form_payout_channel': { en: 'Channel / Note', ur: 'چینل یا تفصیل' },
    'form_payout_channel_placeholder': { en: 'e.g. Foodpanda Week 42, Catering Order #10', ur: 'مثلاً: فوڈ پانڈا ہفتہ 1، کیٹرنگ آرڈر، ہوم ڈیلیوری' },
    'btn_save_payout': { en: 'Save Payout', ur: 'آمدنی محفوظ کریں' },
    'payout_received_box': { en: 'Payout Received', ur: 'موصول شدہ رقم' },
    'payout_kitchen_expenses': { en: 'Kitchen Expenses', ur: 'کچن کے اخراجات' },
    'payout_items_count': { en: 'items', ur: 'اشیاء' },
    'payout_received_on': { en: 'Received on', ur: 'موصول شدہ:' },
    'payout_period_label': { en: 'Period:', ur: 'مدت:' },
    'no_payouts_found': { en: 'No payouts recorded yet.', ur: 'ابھی تک کوئی آمدنی درج نہیں کی گئی۔' },

    // Categories Tab
    'categories_title': { en: 'Expense Categories', ur: 'اخراجات کی کیٹیگریز' },
    'categories_desc': { en: 'Manage categories used to organize grocery and kitchen purchases with custom colors and icons.', ur: 'کچن اور راشن کے سودا سلف کو الگ الگ زمروں میں منظم کرنے کی ترتیبات۔' },
    'btn_new_category': { en: 'New Category', ur: '+ نئی کیٹیگری' },
    'modal_add_cat_title': { en: 'Add New Category', ur: 'نئی کیٹیگری بنائیں' },
    'modal_edit_cat_title': { en: 'Edit Category', ur: 'کیٹیگری تبدیل کریں' },
    'form_cat_name': { en: 'Category Name', ur: 'کیٹیگری کا نام' },
    'form_cat_name_placeholder': { en: 'e.g. Cleaning Supplies, Beverages', ur: 'مثلاً: صفائی کا سامان، مصالحہ جات' },
    'form_cat_color': { en: 'Color Badge', ur: 'رنگ منتخب کریں' },
    'form_cat_icon': { en: 'Icon Symbol', ur: 'آئیکن / ایموجی' },
    'btn_save_category': { en: 'Save Category', ur: 'کیٹیگری محفوظ کریں' },
    'cat_view_expenses': { en: 'View expenses', ur: 'اخراجات دیکھیں' },
    'cat_modal_total_spent': { en: 'Total Spent', ur: 'کل خرچ' },
    'cat_modal_purchases': { en: 'Purchases', ur: 'خریداریاں' },
    'cat_modal_add_exp': { en: '+ Add Expense', ur: '+ نیا خرچہ' },
    'cat_modal_view_in_tab': { en: 'View in Expenses Tab →', ur: 'اخراجات کے ٹیب میں دیکھیں ←' },
    'cat_modal_no_expenses': { en: 'No expenses found for this category.', ur: 'اس کیٹیگری میں ابھی کوئی خرچہ درج نہیں ہے۔' },

    // Settings Tab
    'settings_language_title': { en: 'Language / زبان', ur: 'زبان کا انتخاب (Language)' },
    'settings_language_desc': { en: 'Choose your preferred language for the whole application.', ur: 'پوری ویب سائٹ کے لیے اپنی پسندیدہ زبان منتخب کریں۔' },
    'lang_opt_english': { en: 'English', ur: 'English (انگریزی)' },
    'lang_opt_urdu': { en: 'اردو (Urdu)', ur: 'اردو (Urdu)' },
    'kitchen_prefs_title': { en: 'Kitchen Preferences', ur: 'کچن کی ترتیبات' },
    'form_kitchen_name': { en: 'Kitchen Name', ur: 'کچن کا نام' },
    'form_currency': { en: 'Currency Symbol', ur: 'کرنسی' },
    'btn_save_prefs': { en: 'Save Preferences', ur: 'ترتیبات محفوظ کریں' },
    'pin_protection_title': { en: 'PIN Code & Screen Lock Protection', ur: 'پن کوڈ اور سیکیورٹی پروٹیکشن' },
    'pin_protection_desc': { en: 'Protect your kitchen records from unauthorized public access.', ur: 'اپنے کچن کے تمام ریکارڈز کو پن کوڈ کے ذریعے محفوظ بنائیں۔' },
    'pin_require_title': { en: 'Require PIN on App Entry', ur: 'ایپ کھولنے پر پن کوڈ لازم کریں' },
    'pin_require_desc': { en: 'When enabled, users must enter a 4-digit PIN to access data', ur: 'فعال ہونے پر ڈیٹا دیکھنے سے پہلے 4 ہندسوں کا پن کوڈ درج کرنا ہوگا' },
    'change_pin_title': { en: 'Change PIN Code', ur: 'پن کوڈ تبدیل کریں' },
    'form_current_pin': { en: 'Current PIN', ur: 'موجودہ پن کوڈ' },
    'form_new_pin': { en: 'New 4-Digit PIN', ur: 'نیا 4 ہندسوں کا پن کوڈ' },
    'btn_update_pin': { en: 'Update PIN', ur: 'نیا پن کوڈ محفوظ کریں' },
    'cloud_backup_title': { en: 'Data Security & GitHub Cloud Backup', ur: 'ڈیٹا سیکیورٹی اور خودکار کلاؤڈ بیک اپ' },
    'cloud_backup_active': { en: 'Cloud Auto-Backup Active', ur: 'خودکار کلاؤڈ بیک اپ فعال ہے' },
    'cloud_backup_subtitle': { en: 'Instantly saving every change to local SQLite & GitHub', ur: 'ہر اندراج خود بخود محفوظ ہو رہا ہے' },
    'sync_git_btn': { en: 'Sync GitHub Now', ur: 'ابھی کلاؤڈ پر محفوظ کریں' },
    'cloud_backup_p': { en: 'Every transaction you record is immediately written to SQLite with zero-delay checkpointing, archived locally, and pushed to your GitHub repository.', ur: 'ہر خرچہ اور ادائیگی فوری طور پر ڈیٹا بیس میں محفوظ کی جاتی ہے اور خودکار طور پر بیک اپ بن جاتا ہے۔' },
    'download_db_btn': { en: 'Download Database (.db)', ur: 'ڈیٹا بیس فائل ڈاؤن لوڈ کریں (.db)' },
    'download_all_csv_btn': { en: 'Export CSV (Excel)', ur: 'ایکسل فائل ڈاؤن لوڈ کریں (CSV)' },
    'restore_db_btn': { en: 'Restore Backup (.db)', ur: 'بیک اپ فائل بحال کریں' },

    // Delete Modal
    'delete_confirm_title': { en: 'Confirm Delete', ur: 'ڈیلیٹ کرنے کی تصدیق' },
    'delete_confirm_p': { en: 'Are you sure you want to delete this record?', ur: 'کیا آپ واقعی یہ ریکارڈ حذف کرنا چاہتے ہیں؟' },
    'btn_confirm_delete': { en: 'Delete', ur: 'ہاں، ڈیلیٹ کریں' },

    // PIN Screen
    'pin_screen_title': { en: 'Cloud Kitchen', ur: 'کلاؤڈ کچن' },
    'pin_screen_subtitle': { en: 'Enter PIN to unlock', ur: 'ایپ کھولنے کے لیے پن کوڈ درج کریں' },
    'pin_error_incorrect': { en: 'Incorrect PIN. Please try again.', ur: 'غلط پن کوڈ! دوبارہ کوشش کریں۔' },

    // Toasts
    'toast_switched_lang': { en: 'Switched to English', ur: 'اردو زبان منتخب کر لی گئی' },
    'toast_unlocked': { en: 'Unlocked successfully', ur: 'لاگ ان کامیاب رہا' },
    'toast_expense_added': { en: 'Expense added successfully', ur: 'نیا خرچہ کامیابی سے درج ہو گیا' },
    'toast_expense_updated': { en: 'Expense updated successfully', ur: 'خرچہ کامیابی سے تبدیل ہو گیا' },
    'toast_expense_deleted': { en: 'Expense deleted', ur: 'خرچہ ڈیلیٹ کر دیا گیا' },
    'toast_payout_saved': { en: 'Payout saved successfully', ur: 'آمدنی کامیابی سے محفوظ ہو گئی' },
    'toast_payout_deleted': { en: 'Payout deleted', ur: 'آمدنی ڈیلیٹ کر دی گئی' },
    'toast_prefs_saved': { en: 'Preferences saved successfully', ur: 'ترتیبات کامیابی سے محفوظ ہو گئیں' },
    'toast_pin_updated': { en: 'PIN updated successfully!', ur: 'پن کوڈ کامیابی سے تبدیل ہو گیا!' },
    'toast_download_preparing': { en: 'Preparing download...', ur: 'فائل تیار کی جا رہی ہے...' },
    'toast_download_started': { en: 'Download started', ur: 'ڈاؤن لوڈ شروع ہو گیا' }
  },

  // Helper to translate a key
  t(key, fallback = '') {
    const item = this.translations[key];
    if (item && item[this.currentLang]) {
      return item[this.currentLang];
    }
    return fallback || key;
  },

  // Translate category name
  getCategoryName(name) {
    if (!name) return '';
    if (!this.isUrdu()) return name;

    const lower = name.toLowerCase().trim();
    if (this.categoriesUrdu[lower]) return this.categoriesUrdu[lower];

    // Partial search
    for (const [eng, urdu] of Object.entries(this.categoriesUrdu)) {
      if (lower.includes(eng) || eng.includes(lower)) {
        return urdu;
      }
    }
    return name;
  },

  // Translate unit
  getUnitName(unit) {
    if (!unit) return '';
    const langUnits = this.units[this.currentLang] || this.units.en;
    return langUnits[unit] || unit;
  },

  // Suggestions removed per simplification
  getItemSuggestions(catName) {
    return [];
  },

  // Set Language and update DOM
  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'ur') lang = 'en';
    this.currentLang = lang;
    localStorage.setItem('kitchen_lang', lang);

    const isUr = (lang === 'ur');
    document.documentElement.lang = lang;
    document.documentElement.dir = isUr ? 'rtl' : 'ltr';

    if (isUr) {
      document.body.classList.add('lang-ur');
      document.documentElement.classList.add('lang-ur');
    } else {
      document.body.classList.remove('lang-ur');
      document.documentElement.classList.remove('lang-ur');
    }

    this.applyToDOM();

    // Notify App and sub-modules
    if (window.App && typeof window.App.onLanguageChange === 'function') {
      window.App.onLanguageChange(lang);
    }
  },

  // Toggle Language between English and Urdu
  toggleLanguage() {
    const next = this.currentLang === 'ur' ? 'en' : 'ur';
    this.setLanguage(next);
    if (window.App && typeof window.App.showToast === 'function') {
      window.App.showToast(this.t('toast_switched_lang'), 'info');
    }
  },

  // Translate all DOM elements with data-i18n attributes
  applyToDOM() {
    // 1. Text elements
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation && translation !== key) {
        el.textContent = translation;
      }
    });

    // 2. HTML elements with rich content
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const translation = this.t(key);
      if (translation && translation !== key) {
        el.innerHTML = translation;
      }
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = this.t(key);
      if (translation) {
        el.setAttribute('placeholder', translation);
      }
    });

    // 4. Titles & Aria Labels
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const translation = this.t(key);
      if (translation) {
        el.setAttribute('title', translation);
        el.setAttribute('aria-label', translation);
      }
    });

    // 5. Update language toggle buttons
    const mobileBtnText = document.getElementById('mobileLangBtnText');
    if (mobileBtnText) {
      mobileBtnText.textContent = this.currentLang === 'ur' ? 'English' : 'اردو';
    }

    const desktopLabel = document.getElementById('desktopLangLabel');
    if (desktopLabel) {
      desktopLabel.textContent = this.currentLang === 'ur' ? 'Language: English' : 'زبان: اردو';
    }

    const pinBtn = document.getElementById('pinLangToggleBtn');
    if (pinBtn) {
      pinBtn.textContent = this.currentLang === 'ur' ? 'English' : 'اردو';
    }

    // 6. Update Settings Language radio buttons if present
    const radEn = document.getElementById('langRadioEn');
    const radUr = document.getElementById('langRadioUr');
    if (radEn && radUr) {
      radEn.checked = (this.currentLang === 'en');
      radUr.checked = (this.currentLang === 'ur');
    }

    // 7. Update Units dropdown in Expense Modal
    const unitSelect = document.getElementById('expUnitSelect');
    if (unitSelect) {
      const currentVal = unitSelect.value;
      const langUnits = this.units[this.currentLang] || this.units.en;
      unitSelect.innerHTML = Object.entries(langUnits).map(([val, label]) => `
        <option value="${val}">${label}</option>
      `).join('');
      unitSelect.value = currentVal;
    }
  }
};

window.I18n = I18n;
