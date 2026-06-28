import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'English' | 'Swahili' | 'French';

type Dictionary = Record<string, string>;

const translations: Record<Language, Dictionary> = {
  English: {
    // Tab labels
    'tab.home': 'Home',
    'tab.explore': 'Explore',
    'tab.bible': 'Bible',
    'tab.community': 'Community',
    'tab.profile': 'Profile',

    // Headers & Labels
    'home.title': 'Today\'s Feed',
    'explore.title': 'Explore',
    'explore.subtitle': 'Discover, grow and strengthen your faith',
    'bible.title': 'Bible',
    'bible.subtitle': 'World English Bible',
    'community.title': 'Community',
    'community.subtitle': 'Share your faith. Inspire others.',
    'profile.title': 'Profile',
    'profile.preferences': 'Preferences',
    'profile.account': 'Account',
    'profile.activity': 'My Activity',
    'profile.session': 'Session',

    // Common Phrases
    'loading.feed': 'Loading feed...',
    'loading.chapter': 'Loading chapter...',
    'error.load': 'Couldn\'t load content.',
    'retry': 'Retry',
    'share': 'Share',
    'save': 'Save',
    'saved': 'Saved',
    'coming_soon': 'Coming Soon',

    // Empty States
    'home.empty.title': 'No content yet.',
    'home.empty.subtitle': 'Admins will publish quotes, verses, and videos soon.',
    'community.empty.title': 'No posts yet.',
    'community.empty.subtitle': 'Be the first to share your faith!',
    'explore.coming_soon.title': 'Explore Coming Soon',
    'explore.coming_soon.text': 'Search prayers, verses, videos, and topics — launching in the next update.',

    // Community Create Post
    'community.create.title': 'Create Post',
    'community.create.placeholder': 'What\'s on your mind?',
    'community.create.photo': 'Photo',
    'community.create.video': 'Video',
    'community.create.post': 'Post',
    'community.create.uploading': 'Uploading...',
    'community.create.limit': 'Max 7 MB.',
    'community.create.error.size': 'Image is too large. Limit is 7 MB.',
    'community.create.error.permission': 'Photo access permissions are required.',

    // Profile Settings
    'profile.dark_mode': 'Dark Mode',
    'profile.language': 'Language',
    'profile.update_pwd': 'Update Password',
    'profile.fb_link': 'Facebook Link',
    'profile.switch_account': 'Switch Account',
    'profile.giving_history': 'Giving History',
    'profile.notifications': 'Notifications',
    'profile.saved_posts': 'Saved Posts',
    'profile.logout': 'Log Out',
    'profile.admin_dashboard': 'Admin Dashboard',
  },
  Swahili: {
    // Tab labels
    'tab.home': 'Nyumbani',
    'tab.explore': 'Gundua',
    'tab.bible': 'Biblia',
    'tab.community': 'Jamii',
    'tab.profile': 'Wasifu',

    // Headers & Labels
    'home.title': 'Mlisho wa Leo',
    'explore.title': 'Gundua',
    'explore.subtitle': 'Gundua, kua na kuimarisha imani yako',
    'bible.title': 'Biblia',
    'bible.subtitle': 'Biblia ya Kiingereza ya Ulimwengu',
    'community.title': 'Jamii',
    'community.subtitle': 'Shirikisha imani yako. Wavutie wengine.',
    'profile.title': 'Wasifu',
    'profile.preferences': 'Mapendeleo',
    'profile.account': 'Akaunti',
    'profile.activity': 'Shughuli Zangu',
    'profile.session': 'Kipindi',

    // Common Phrases
    'loading.feed': 'Inapakia mlisho...',
    'loading.chapter': 'Inapakia sura...',
    'error.load': 'Imeshindwa kupakia maudhui.',
    'retry': 'Jaribu tena',
    'share': 'Shiriki',
    'save': 'Hifadhi',
    'saved': 'Imehifadhiwa',
    'coming_soon': 'Inakuja Hivi Karibuni',

    // Empty States
    'home.empty.title': 'Hakuna maudhui bado.',
    'home.empty.subtitle': 'Wasimamizi watachapisha nukuu, aya, na video hivi karibuni.',
    'community.empty.title': 'Hakuna machapisho bado.',
    'community.empty.subtitle': 'Kuwa wa kwanza kushiriki imani yako!',
    'explore.coming_soon.title': 'Gundua Inakuja Hivi Karibuni',
    'explore.coming_soon.text': 'Tafuta sala, aya, video, na mada — inazinduliwa katika sasisho linalofuata.',

    // Community Create Post
    'community.create.title': 'Unda Chapisho',
    'community.create.placeholder': 'Unafikiria nini?',
    'community.create.photo': 'Picha',
    'community.create.video': 'Video',
    'community.create.post': 'Chapisha',
    'community.create.uploading': 'Inapakia...',
    'community.create.limit': 'Kiwango cha juu 7 MB.',
    'community.create.error.size': 'Picha ni kubwa sana. Kiwango ni 7 MB.',
    'community.create.error.permission': 'Ruhusa ya kufikia picha inahitajika.',

    // Profile Settings
    'profile.dark_mode': 'Hali ya Giza',
    'profile.language': 'Lugha',
    'profile.update_pwd': 'Sasisha Nywila',
    'profile.fb_link': 'Kiungo cha Facebook',
    'profile.switch_account': 'Badilisha Akaunti',
    'profile.giving_history': 'Historia ya Kutoa',
    'profile.notifications': 'Arifa',
    'profile.saved_posts': 'Machapisho Yaliyohifadhiwa',
    'profile.logout': 'Ondoka',
    'profile.admin_dashboard': 'Wasifu wa Usimamizi',
  },
  French: {
    // Tab labels
    'tab.home': 'Accueil',
    'tab.explore': 'Explorer',
    'tab.bible': 'Bible',
    'tab.community': 'Communauté',
    'tab.profile': 'Profil',

    // Headers & Labels
    'home.title': 'Fil d\'aujourd\'hui',
    'explore.title': 'Explorer',
    'explore.subtitle': 'Découvrez, grandissez et fortifiez votre foi',
    'bible.title': 'Bible',
    'bible.subtitle': 'Bible Anglaise Mondiale',
    'community.title': 'Communauté',
    'community.subtitle': 'Partagez votre foi. Inspirez les autres.',
    'profile.title': 'Profil',
    'profile.preferences': 'Préférences',
    'profile.account': 'Compte',
    'profile.activity': 'Mon Activité',
    'profile.session': 'Session',

    // Common Phrases
    'loading.feed': 'Chargement du fil...',
    'loading.chapter': 'Chargement du chapitre...',
    'error.load': 'Impossible de charger le contenu.',
    'retry': 'Réessayer',
    'share': 'Partager',
    'save': 'Enregistrer',
    'saved': 'Enregistré',
    'coming_soon': 'Bientôt disponible',

    // Empty States
    'home.empty.title': 'Aucun contenu pour l\'instant.',
    'home.empty.subtitle': 'Les administrateurs publieront bientôt des citations, des versets et des vidéos.',
    'community.empty.title': 'Aucun message pour l\'instant.',
    'community.empty.subtitle': 'Soyez le premier à partager votre foi !',
    'explore.coming_soon.title': 'Explorer arrive bientôt',
    'explore.coming_soon.text': 'Recherchez des prières, des versets, des vidéos et des sujets — lancement dans la prochaine mise à jour.',

    // Community Create Post
    'community.create.title': 'Créer un message',
    'community.create.placeholder': 'À quoi pensez-vous ?',
    'community.create.photo': 'Photo',
    'community.create.video': 'Vidéo',
    'community.create.post': 'Publier',
    'community.create.uploading': 'Téléchargement...',
    'community.create.limit': 'Max 7 Mo.',
    'community.create.error.size': 'L\'image est trop grande. La limite est de 7 Mo.',
    'community.create.error.permission': 'Les autorisations d\'accès aux photos sont requises.',

    // Profile Settings
    'profile.dark_mode': 'Mode Sombre',
    'profile.language': 'Langue',
    'profile.update_pwd': 'Modifier le mot de passe',
    'profile.fb_link': 'Lien Facebook',
    'profile.switch_account': 'Changer de compte',
    'profile.giving_history': 'Historique des dons',
    'profile.notifications': 'Notifications',
    'profile.saved_posts': 'Messages enregistrés',
    'profile.logout': 'Se déconnecter',
    'profile.admin_dashboard': 'Tableau de bord admin',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@too_humble_language';

export function LanguageProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [language, setLangState] = useState<Language>('English');

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (storedLang === 'English' || storedLang === 'Swahili' || storedLang === 'French') {
          setLangState(storedLang);
        }
      } catch (err) {
        console.error('[LanguageContext] Failed to load language:', err);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (newLang: Language) => {
    setLangState(newLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (err) {
      console.error('[LanguageContext] Failed to save language:', err);
    }
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] ?? translations['English'][key] ?? key;
    },
    [language]
  );

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
