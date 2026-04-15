import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = (process.env.EXPO_PUBLIC_FARM_WEB_URL || 'https://multiply-prompt-sparrow.ngrok-free.app/login').replace('/login', '');

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline' },
  { key: 'animals', label: 'Animals', icon: 'sheep' },
  { key: 'breeding', label: 'Breeding', icon: 'sprout-outline' },
  { key: 'users', label: 'Users', icon: 'account-group-outline', adminOnly: true },
  { key: 'logout', label: 'Logout', icon: 'logout' },
];

const API_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true',
};

const SPECIES_OPTIONS = ['sheep', 'goat', 'other'];
const GENDER_OPTIONS = ['female', 'male'];
const STATUS_OPTIONS = ['Active', 'Pregnant', 'Lactating', 'Sold', 'Deceased', 'Slaughtered'];
const USER_ROLE_OPTIONS = ['readonly', 'super_user', 'admin'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DRAFT_KEYS = {
  animal: 'farmMobile:animalDraft',
  event: 'farmMobile:eventDraft',
  user: 'farmMobile:userDraft',
};

function useApi() {
  const call = async (path, options = {}) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || 'GET',
      credentials: 'include',
      headers: { ...API_HEADERS, ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }
    return data;
  };

  return { call };
}

function LabeledInput({ label, value, onChangeText, secureTextEntry = false }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
    </View>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <Text style={styles.fieldError}>{message}</Text>;
}

function DateField({ label, value, onPress, error }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={[styles.dateInput, error && styles.dateInputError]} onPress={onPress}>
        <Text style={[styles.dateInputText, !value && styles.dateInputPlaceholder]}>{value || 'Select date'}</Text>
        <MaterialCommunityIcons name="calendar-month" size={18} color="#166534" />
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function ChipSelector({ label, options, value, onSelect }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const { call } = useApi();
  const toastTimeoutRef = useRef(null);
  const emptyAnimalForm = {
    id: null,
    tag_id: '',
    name: '',
    species: 'sheep',
    gender: 'female',
    date_of_birth: '',
    animal_status: 'Active',
    notes: '',
    sire_id: '',
    dam_id: '',
  };
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [drawerCollapsed, setDrawerCollapsed] = useState(true);

  const [dashboard, setDashboard] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [animalQuery, setAnimalQuery] = useState('');
  const [seasons, setSeasons] = useState([]);
  const [users, setUsers] = useState([]);
  const [allAnimals, setAllAnimals] = useState([]);
  const [busyMessage, setBusyMessage] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [animalFormVisible, setAnimalFormVisible] = useState(false);
  const [isSavingAnimal, setIsSavingAnimal] = useState(false);
  const [deletingAnimalId, setDeletingAnimalId] = useState(null);
  const [animalFormError, setAnimalFormError] = useState('');
  const [animalFieldErrors, setAnimalFieldErrors] = useState({});
  const [animalForm, setAnimalForm] = useState(emptyAnimalForm);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonDetail, setSeasonDetail] = useState(null);
  const [eventFormVisible, setEventFormVisible] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [eventFormError, setEventFormError] = useState('');
  const [eventFieldErrors, setEventFieldErrors] = useState({});
  const [eventForm, setEventForm] = useState({
    id: null,
    ewe_id: '',
    sire_id: '',
    exposure_date: '',
    scan_date: '',
    scan_result: '',
    expected_due_date: '',
  });
  const [eweSearch, setEweSearch] = useState('');
  const [sireSearch, setSireSearch] = useState('');
  const [userFormVisible, setUserFormVisible] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [userFormError, setUserFormError] = useState('');
  const [userFieldErrors, setUserFieldErrors] = useState({});
  const [userForm, setUserForm] = useState({
    id: null,
    username: '',
    email: '',
    role: 'readonly',
    password: '',
  });
  const [pendingEventSeasonId, setPendingEventSeasonId] = useState(null);
  const [datePicker, setDatePicker] = useState({
    visible: false,
    target: '',
    value: new Date(),
  });

  const canManageUsers = user?.role === 'admin';
  const canEditData = user?.role === 'admin' || user?.role === 'super_user';

  const visibleNav = useMemo(() => NAV.filter((item) => !item.adminOnly || canManageUsers), [canManageUsers]);
  const eweCandidates = useMemo(() => {
    const q = eweSearch.trim().toLowerCase();
    return allAnimals
      .filter((a) => a.gender === 'female')
      .filter((a) => !q || (a.tag_id || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allAnimals, eweSearch]);
  const sireCandidates = useMemo(() => {
    const q = sireSearch.trim().toLowerCase();
    return allAnimals
      .filter((a) => a.gender === 'male')
      .filter((a) => !q || (a.tag_id || '').toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q))
      .slice(0, 8);
  }, [allAnimals, sireSearch]);

  const triggerLight = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // No-op.
    }
  };

  const showToast = (message, type = 'success') => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ visible: true, message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 2400);
  };

  const clearDraft = async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage failures.
    }
  };

  const restoreDrafts = async () => {
    try {
      const [animalDraftRaw, eventDraftRaw, userDraftRaw] = await Promise.all([
        AsyncStorage.getItem(DRAFT_KEYS.animal),
        AsyncStorage.getItem(DRAFT_KEYS.event),
        AsyncStorage.getItem(DRAFT_KEYS.user),
      ]);

      if (animalDraftRaw) {
        const animalDraft = JSON.parse(animalDraftRaw);
        if (animalDraft?.form) {
          setAnimalForm({ ...emptyAnimalForm, ...animalDraft.form });
          setAnimalFormVisible(true);
          showToast('Animal draft restored.');
        }
      }

      if (eventDraftRaw) {
        const eventDraft = JSON.parse(eventDraftRaw);
        if (eventDraft?.form) {
          setEventForm({
            id: null,
            ewe_id: '',
            sire_id: '',
            exposure_date: '',
            scan_date: '',
            scan_result: '',
            expected_due_date: '',
            ...eventDraft.form,
          });
          setEventFormVisible(true);
          setPendingEventSeasonId(eventDraft.seasonId || null);
          showToast('Breeding event draft restored.');
        }
      }

      if (userDraftRaw) {
        const userDraft = JSON.parse(userDraftRaw);
        if (userDraft?.form) {
          setUserForm({ id: null, username: '', email: '', role: 'readonly', password: '', ...userDraft.form });
          setUserFormVisible(true);
          showToast('User draft restored.');
        }
      }
    } catch {
      // Ignore invalid draft payloads.
    }
  };

  const parseDateValue = (value) => {
    if (value && DATE_RE.test(value)) {
      const [y, m, d] = value.split('-').map((x) => parseInt(x, 10));
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const toIsoDate = (date) => {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const openDatePicker = (target, currentValue) => {
    setDatePicker({
      visible: true,
      target,
      value: parseDateValue(currentValue),
    });
  };

  const applyDateValue = (target, selectedDate) => {
    const value = toIsoDate(selectedDate);
    if (target === 'animal.date_of_birth') {
      setAnimalForm((prev) => ({ ...prev, date_of_birth: value }));
      return;
    }
    if (target === 'event.exposure_date') {
      setEventForm((prev) => ({ ...prev, exposure_date: value }));
      return;
    }
    if (target === 'event.scan_date') {
      setEventForm((prev) => ({ ...prev, scan_date: value }));
      return;
    }
    if (target === 'event.expected_due_date') {
      setEventForm((prev) => ({ ...prev, expected_due_date: value }));
    }
  };

  const isValidDate = (value) => !value || DATE_RE.test(value);

  const validateAnimalForm = () => {
    const errors = {};
    if (!animalForm.tag_id.trim()) errors.tag_id = 'Tag ID is required.';
    if (!SPECIES_OPTIONS.includes(animalForm.species)) errors.species = 'Please select a valid species.';
    if (!GENDER_OPTIONS.includes(animalForm.gender)) errors.gender = 'Please select a valid gender.';
    if (!STATUS_OPTIONS.includes(animalForm.animal_status)) errors.animal_status = 'Please select a valid status.';
    if (animalForm.date_of_birth && !isValidDate(animalForm.date_of_birth.trim())) {
      errors.date_of_birth = 'Date of birth must be YYYY-MM-DD.';
    }
    if (animalForm.gender === 'male' && ['Pregnant', 'Lactating'].includes(animalForm.animal_status)) {
      errors.animal_status = 'A male animal cannot be Pregnant or Lactating.';
    }
    return errors;
  };

  const validateEventForm = () => {
    const errors = {};
    if (!eventForm.ewe_id) errors.ewe_id = 'Ewe is required.';
    if (!eventForm.sire_id) errors.sire_id = 'Sire is required.';
    if (!eventForm.exposure_date) errors.exposure_date = 'Exposure date is required.';
    if (eventForm.exposure_date && !isValidDate(eventForm.exposure_date)) errors.exposure_date = 'Exposure date must be YYYY-MM-DD.';
    if (eventForm.scan_date && !isValidDate(eventForm.scan_date)) errors.scan_date = 'Scan date must be YYYY-MM-DD.';
    if (eventForm.expected_due_date && !isValidDate(eventForm.expected_due_date)) {
      errors.expected_due_date = 'Expected due date must be YYYY-MM-DD.';
    }
    return errors;
  };

  const validateUserForm = () => {
    const errors = {};
    if (!userForm.username.trim()) errors.username = 'Username is required.';
    if (!userForm.email.trim()) errors.email = 'Email is required.';
    if (userForm.email.trim() && !/^\S+@\S+\.\S+$/.test(userForm.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!USER_ROLE_OPTIONS.includes(userForm.role)) errors.role = 'Please select a valid role.';
    if (!userForm.id && !userForm.password.trim()) errors.password = 'Password is required when creating a user.';
    return errors;
  };

  const loadSession = async () => {
    setLoading(true);
    try {
      const data = await call('/login');
      if (data.authenticated && data.user) {
        setUser(data.user);
      }
    } catch {
      // Keep user as logged out.
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    const data = await call('/dashboard');
    setDashboard(data);
  };

  const loadAnimals = async () => {
    const qs = animalQuery ? `?q=${encodeURIComponent(animalQuery)}` : '';
    const data = await call(`/animals${qs}`);
    setAnimals(data.items || []);
  };

  const loadAllAnimals = async () => {
    const data = await call('/animals?page=1&per_page=500');
    setAllAnimals(data.items || []);
  };

  const loadSeasons = async () => {
    const data = await call('/breeding');
    setSeasons(data.items || []);
  };

  const loadSeasonDetail = async (seasonId) => {
    const data = await call(`/breeding/season/${seasonId}`);
    setSeasonDetail(data);
  };

  const loadUsers = async () => {
    if (!canManageUsers) return;
    const data = await call('/admin/users');
    setUsers(data.items || []);
  };

  const refreshActive = async () => {
    setBusyMessage('Refreshing...');
    try {
      if (activeTab === 'dashboard') await loadDashboard();
      if (activeTab === 'animals') await loadAnimals();
      if (activeTab === 'breeding') await loadSeasons();
      if (activeTab === 'users') await loadUsers();
    } finally {
      setBusyMessage('');
    }
  };

  const login = async () => {
    setAuthError('');
    setIsLoggingIn(true);
    setBusyMessage('Signing in...');
    try {
      const data = await call('/login', {
        method: 'POST',
        body: { username, password, remember_me: true },
      });
      setUser(data.user);
      setPassword('');
      showToast('Signed in successfully.');
    } catch (err) {
      setAuthError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsLoggingIn(false);
      setBusyMessage('');
    }
  };

  const logout = async () => {
    setBusyMessage('Signing out...');
    try {
      await call('/logout');
    } catch {
      // noop
    } finally {
      setUser(null);
      setActiveTab('dashboard');
      setBusyMessage('');
      showToast('Signed out.');
    }
  };

  const openAnimalCreateForm = () => {
    setAnimalFormError('');
    setAnimalFieldErrors({});
    setAnimalForm({ ...emptyAnimalForm, tag_id: `TAG-${Date.now().toString().slice(-6)}` });
    setAnimalFormVisible(true);
  };

  const openAnimalEditForm = (animal) => {
    setAnimalFormError('');
    setAnimalFieldErrors({});
    setAnimalForm({
      id: animal.id,
      tag_id: animal.tag_id || '',
      name: animal.name || '',
      species: animal.species || 'sheep',
      gender: animal.gender || 'female',
      date_of_birth: animal.date_of_birth || '',
      animal_status: animal.animal_status || 'Active',
      notes: animal.notes || '',
      sire_id: animal.sire_id ? String(animal.sire_id) : '',
      dam_id: animal.dam_id ? String(animal.dam_id) : '',
    });
    setAnimalFormVisible(true);
  };

  const closeAnimalForm = () => {
    setAnimalFormVisible(false);
    setAnimalFormError('');
    setAnimalFieldErrors({});
    setAnimalForm(emptyAnimalForm);
    clearDraft(DRAFT_KEYS.animal);
  };

  const saveAnimal = async () => {
    if (!canEditData) return;
    const validationErrors = validateAnimalForm();
    setAnimalFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      setAnimalFormError(firstError);
      showToast(firstError, 'error');
      return;
    }

    const payload = {
      tag_id: animalForm.tag_id.trim(),
      name: animalForm.name.trim(),
      species: animalForm.species,
      gender: animalForm.gender,
      date_of_birth: animalForm.date_of_birth.trim() || null,
      animal_status: animalForm.animal_status,
      notes: animalForm.notes,
      sire_id: animalForm.sire_id.trim() || null,
      dam_id: animalForm.dam_id.trim() || null,
    };

    setBusyMessage(animalForm.id ? 'Updating animal...' : 'Creating animal...');
    setIsSavingAnimal(true);
    setAnimalFormError('');
    try {
      let response;
      if (animalForm.id) {
        response = await call(`/animal/${animalForm.id}/edit`, { method: 'POST', body: payload });
      } else {
        response = await call('/animal/add', { method: 'POST', body: payload });
      }
      if (response?.animal) {
        const updated = response.animal;
        setAnimals((prev) => {
          const exists = prev.some((a) => a.id === updated.id);
          if (exists) {
            return prev.map((a) => (a.id === updated.id ? updated : a));
          }
          return [updated, ...prev];
        });
      }
      await triggerLight();
      showToast(animalForm.id ? 'Animal updated.' : 'Animal created.');
      clearDraft(DRAFT_KEYS.animal);
      closeAnimalForm();
    } catch (err) {
      setAnimalFormError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSavingAnimal(false);
      setBusyMessage('');
    }
  };

  const deleteAnimal = async (animal) => {
    if (!canManageUsers) return;
    Alert.alert(
      'Delete Animal',
      `Delete ${animal.tag_id}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingAnimalId(animal.id);
            setBusyMessage('Deleting animal...');
            try {
              await call(`/animal/${animal.id}/delete`, { method: 'DELETE' });
              setAnimals((prev) => prev.filter((a) => a.id !== animal.id));
              await triggerLight();
              showToast('Animal deleted.');
            } finally {
              setDeletingAnimalId(null);
              setBusyMessage('');
            }
          },
        },
      ]
    );
  };

  const createSeason = async () => {
    if (!canEditData) return;
    setBusyMessage('Creating season...');
    try {
      const year = new Date().getFullYear();
      await call('/breeding/season/add', {
        method: 'POST',
        body: {
          name: `Season ${year} ${Date.now().toString().slice(-4)}`,
          start_date: `${year}-01-01`,
          end_date: `${year}-03-31`,
          notes: 'Created from mobile app',
        },
      });
      await loadSeasons();
      await triggerLight();
      showToast('Season created.');
    } finally {
      setBusyMessage('');
    }
  };

  const openEventForm = (event = null) => {
    setEventFormError('');
    setEventFieldErrors({});
    setEweSearch('');
    setSireSearch('');
    if (event) {
      setEventForm({
        id: event.id,
        ewe_id: String(event.ewe_id || ''),
        sire_id: String(event.sire_id || ''),
        exposure_date: event.exposure_date || '',
        scan_date: event.scan_date || '',
        scan_result: event.scan_result || '',
        expected_due_date: event.expected_due_date || '',
      });
    } else {
      setEventForm({ id: null, ewe_id: '', sire_id: '', exposure_date: '', scan_date: '', scan_result: '', expected_due_date: '' });
    }
    setEventFormVisible(true);
  };

  const closeEventForm = () => {
    setEventFormVisible(false);
    setEventFormError('');
    setEventFieldErrors({});
    clearDraft(DRAFT_KEYS.event);
  };

  const saveEvent = async () => {
    if (!canEditData || !selectedSeason) return;
    const validationErrors = validateEventForm();
    setEventFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      setEventFormError(firstError);
      showToast(firstError, 'error');
      return;
    }
    setBusyMessage(eventForm.id ? 'Updating event...' : 'Creating event...');
    setIsSavingEvent(true);
    try {
      const payload = {
        ewe_id: Number(eventForm.ewe_id),
        sire_id: Number(eventForm.sire_id),
        exposure_date: eventForm.exposure_date,
        scan_date: eventForm.scan_date || null,
        scan_result: eventForm.scan_result || null,
        expected_due_date: eventForm.expected_due_date || null,
      };
      let response;
      if (eventForm.id) {
        response = await call(`/breeding/event/${eventForm.id}/edit`, { method: 'POST', body: payload });
      } else {
        response = await call(`/breeding/season/${selectedSeason.id}/add_event`, { method: 'POST', body: payload });
      }
      if (response?.event) {
        const updated = response.event;
        setSeasonDetail((prev) => {
          if (!prev) return prev;
          const current = prev.events || [];
          const exists = current.some((e) => e.id === updated.id);
          return {
            ...prev,
            events: exists ? current.map((e) => (e.id === updated.id ? updated : e)) : [updated, ...current],
          };
        });
      }
      closeEventForm();
      await triggerLight();
      showToast(eventForm.id ? 'Event updated.' : 'Event created.');
      clearDraft(DRAFT_KEYS.event);
    } catch (err) {
      setEventFormError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSavingEvent(false);
      setBusyMessage('');
    }
  };

  const deleteEvent = (eventId) => {
    if (!canManageUsers || !selectedSeason) return;
    Alert.alert('Delete Event', 'Are you sure you want to delete this mating event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingEventId(eventId);
          setBusyMessage('Deleting event...');
          try {
            await call(`/breeding/event/${eventId}/delete`, { method: 'DELETE' });
            setSeasonDetail((prev) => {
              if (!prev) return prev;
              return { ...prev, events: (prev.events || []).filter((e) => e.id !== eventId) };
            });
            await triggerLight();
            showToast('Event deleted.');
          } finally {
            setDeletingEventId(null);
            setBusyMessage('');
          }
        },
      },
    ]);
  };

  const createUser = async () => {
    if (!canManageUsers) return;
    setUserFormError('');
    setUserFieldErrors({});
    setUserForm({
      id: null,
      username: `mobile_${Date.now().toString().slice(-5)}`,
      email: `mobile_${Date.now().toString().slice(-5)}@farm.local`,
      role: 'readonly',
      password: 'TempPass123!',
    });
    setUserFormVisible(true);
  };

  const editUser = (item) => {
    setUserFormError('');
    setUserFieldErrors({});
    setUserForm({
      id: item.id,
      username: item.username || '',
      email: item.email || '',
      role: item.role || 'readonly',
      password: '',
    });
    setUserFormVisible(true);
  };

  const closeUserForm = () => {
    setUserFormVisible(false);
    setUserFormError('');
    setUserFieldErrors({});
    clearDraft(DRAFT_KEYS.user);
  };

  const saveUser = async () => {
    if (!canManageUsers) return;
    const validationErrors = validateUserForm();
    setUserFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      setUserFormError(firstError);
      showToast(firstError, 'error');
      return;
    }

    setBusyMessage(userForm.id ? 'Updating user...' : 'Creating user...');
    setIsSavingUser(true);
    try {
      const payload = {
        username: userForm.username.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        password: userForm.password.trim() || undefined,
      };
      let response;
      if (userForm.id) {
        response = await call(`/admin/user/${userForm.id}/edit`, { method: 'POST', body: payload });
      } else {
        response = await call('/admin/user/add', { method: 'POST', body: payload });
      }
      if (response?.user) {
        const updated = response.user;
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === updated.id);
          if (exists) {
            return prev.map((u) => (u.id === updated.id ? updated : u));
          }
          return [updated, ...prev];
        });
      }
      await triggerLight();
      showToast(userForm.id ? 'User updated.' : 'User created.');
      clearDraft(DRAFT_KEYS.user);
      closeUserForm();
    } catch (err) {
      setUserFormError(err.message);
      showToast(err.message, 'error');
    } finally {
      setIsSavingUser(false);
      setBusyMessage('');
    }
  };

  const deleteUser = (item) => {
    if (!canManageUsers) return;
    Alert.alert('Delete User', `Delete ${item.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingUserId(item.id);
          setBusyMessage('Deleting user...');
          try {
            await call(`/admin/user/${item.id}/delete`, { method: 'DELETE' });
            setUsers((prev) => prev.filter((u) => u.id !== item.id));
            await triggerLight();
            showToast('User deleted.');
          } finally {
            setDeletingUserId(null);
            setBusyMessage('');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    loadSession();
    restoreDrafts();
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshActive();
    loadAllAnimals();
  }, [user, activeTab, animalQuery]);

  useEffect(() => {
    if (!animalFormVisible) {
      clearDraft(DRAFT_KEYS.animal);
      return;
    }

    AsyncStorage.setItem(DRAFT_KEYS.animal, JSON.stringify({ form: animalForm })).catch(() => {
      // Ignore storage failures.
    });
  }, [animalFormVisible, animalForm]);

  useEffect(() => {
    if (!eventFormVisible || !selectedSeason?.id) {
      if (!eventFormVisible) {
        clearDraft(DRAFT_KEYS.event);
      }
      return;
    }

    AsyncStorage.setItem(
      DRAFT_KEYS.event,
      JSON.stringify({ form: eventForm, seasonId: selectedSeason.id })
    ).catch(() => {
      // Ignore storage failures.
    });
  }, [eventFormVisible, eventForm, selectedSeason]);

  useEffect(() => {
    if (!userFormVisible) {
      clearDraft(DRAFT_KEYS.user);
      return;
    }

    AsyncStorage.setItem(DRAFT_KEYS.user, JSON.stringify({ form: userForm })).catch(() => {
      // Ignore storage failures.
    });
  }, [userFormVisible, userForm]);

  useEffect(() => {
    if (!pendingEventSeasonId || seasons.length === 0) return;
    const matchedSeason = seasons.find((season) => season.id === pendingEventSeasonId);
    if (!matchedSeason) return;

    setSelectedSeason(matchedSeason);
    loadSeasonDetail(matchedSeason.id);
    setPendingEventSeasonId(null);
  }, [pendingEventSeasonId, seasons]);

  if (loading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#166534" />
            <Text style={styles.muted}>Preparing app...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loginCard}>
            <Text style={styles.title}>Farm Manager</Text>
            <Text style={styles.muted}>Sign in to continue</Text>
            <LabeledInput label="Username" value={username} onChangeText={setUsername} />
            <LabeledInput label="Password" value={password} onChangeText={setPassword} secureTextEntry />
            {authError ? <Text style={styles.error}>{authError}</Text> : null}
            <Pressable style={[styles.primaryBtn, isLoggingIn && styles.buttonDisabled]} onPress={login} disabled={isLoggingIn}>
              <Text style={styles.primaryBtnText}>{isLoggingIn ? 'Signing In...' : 'Login'}</Text>
            </Pressable>
          </View>
          {busyMessage ? <Text style={styles.busy}>{busyMessage}</Text> : null}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            style={styles.menuBtn}
            onPress={() => {
              setDrawerCollapsed((prev) => !prev);
              triggerLight();
            }}
          >
            <MaterialCommunityIcons name={drawerCollapsed ? 'menu' : 'menu-open'} size={20} color="#fff" />
            {!drawerCollapsed ? <Text style={styles.menuBtnText}>Collapse</Text> : null}
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Farm Manager</Text>
            <Text style={styles.headerSub}>Native Mobile</Text>
          </View>

          <Pressable style={styles.outlineBtn} onPress={refreshActive}>
            <MaterialCommunityIcons name="refresh" size={16} color="#166534" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={[styles.sidebar, drawerCollapsed && styles.sidebarCollapsed]}>
            {visibleNav.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.sideItem, activeTab === item.key && styles.sideItemActive]}
                onPress={() => {
                  if (item.key === 'logout') {
                    logout();
                    return;
                  }
                  setActiveTab(item.key);
                  triggerLight();
                }}
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={activeTab === item.key ? '#166534' : '#334155'} />
                {!drawerCollapsed ? <Text style={styles.sideItemText}>{item.label}</Text> : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.content}>
            {activeTab === 'dashboard' && (
              <View style={styles.panel}>
                <SectionTitle title="Dashboard" subtitle={`Welcome, ${user.username} (${user.role})`} />
                <View style={styles.metricRow}>
                  <View style={styles.metricCard}><Text style={styles.metricLabel}>Animals</Text><Text style={styles.metricValue}>{dashboard?.stats?.total_animals ?? '-'}</Text></View>
                  <View style={styles.metricCard}><Text style={styles.metricLabel}>Sheep</Text><Text style={styles.metricValue}>{dashboard?.stats?.total_sheep ?? '-'}</Text></View>
                  <View style={styles.metricCard}><Text style={styles.metricLabel}>Goats</Text><Text style={styles.metricValue}>{dashboard?.stats?.total_goats ?? '-'}</Text></View>
                </View>
                <Text style={styles.listHeading}>Recently added</Text>
                <FlatList
                  data={dashboard?.recently_added || []}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={<RefreshControl refreshing={busyMessage === 'Refreshing...'} onRefresh={refreshActive} />}
                  renderItem={({ item }) => (
                    <View style={styles.rowCard}>
                      <Text style={styles.rowTitle}>{item.tag_id}</Text>
                      <Text style={styles.rowMeta}>{item.name || 'Unnamed'} • {item.species} • {item.animal_status}</Text>
                    </View>
                  )}
                />
              </View>
            )}

            {activeTab === 'animals' && (
              <View style={styles.panel}>
                <SectionTitle title="Animals" subtitle="Manage your livestock records" />
                <View style={styles.toolbarRow}>
                  <TextInput
                    style={styles.searchInput}
                    value={animalQuery}
                    onChangeText={setAnimalQuery}
                    placeholder="Search tag, name, species..."
                    placeholderTextColor="#64748b"
                  />
                  {canEditData ? (
                    <Pressable style={[styles.primaryBtnSmall, isSavingAnimal && styles.buttonDisabled]} onPress={openAnimalCreateForm} disabled={isSavingAnimal}>
                      <Text style={styles.primaryBtnText}>Add Animal</Text>
                    </Pressable>
                  ) : null}
                </View>

                {animalFormVisible && (
                  <View style={styles.formCard}>
                    <Text style={styles.formCardTitle}>{animalForm.id ? 'Edit Animal' : 'New Animal'}</Text>
                    <LabeledInput
                      label="Tag ID"
                      value={animalForm.tag_id}
                      onChangeText={(v) => setAnimalForm((prev) => ({ ...prev, tag_id: v }))}
                    />
                    <FieldError message={animalFieldErrors.tag_id} />
                    <LabeledInput
                      label="Name"
                      value={animalForm.name}
                      onChangeText={(v) => setAnimalForm((prev) => ({ ...prev, name: v }))}
                    />
                    <ChipSelector
                      label="Species"
                      options={SPECIES_OPTIONS}
                      value={animalForm.species}
                      onSelect={(v) => setAnimalForm((prev) => ({ ...prev, species: v }))}
                    />
                    <FieldError message={animalFieldErrors.species} />
                    <ChipSelector
                      label="Gender"
                      options={GENDER_OPTIONS}
                      value={animalForm.gender}
                      onSelect={(v) => setAnimalForm((prev) => ({ ...prev, gender: v }))}
                    />
                    <FieldError message={animalFieldErrors.gender} />
                    <ChipSelector
                      label="Status"
                      options={STATUS_OPTIONS}
                      value={animalForm.animal_status}
                      onSelect={(v) => setAnimalForm((prev) => ({ ...prev, animal_status: v }))}
                    />
                    <FieldError message={animalFieldErrors.animal_status} />
                    <DateField
                      label="Date of Birth (YYYY-MM-DD)"
                      value={animalForm.date_of_birth}
                      onPress={() => openDatePicker('animal.date_of_birth', animalForm.date_of_birth)}
                      error={animalFieldErrors.date_of_birth}
                    />
                    <LabeledInput
                      label="Sire ID (optional)"
                      value={animalForm.sire_id}
                      onChangeText={(v) => setAnimalForm((prev) => ({ ...prev, sire_id: v.replace(/[^0-9]/g, '') }))}
                    />
                    <LabeledInput
                      label="Dam ID (optional)"
                      value={animalForm.dam_id}
                      onChangeText={(v) => setAnimalForm((prev) => ({ ...prev, dam_id: v.replace(/[^0-9]/g, '') }))}
                    />
                    <LabeledInput
                      label="Notes"
                      value={animalForm.notes}
                      onChangeText={(v) => setAnimalForm((prev) => ({ ...prev, notes: v }))}
                    />
                    {animalFormError ? <Text style={styles.error}>{animalFormError}</Text> : null}
                    <View style={styles.formActionsRow}>
                      <Pressable style={[styles.secondaryBtnSmall, isSavingAnimal && styles.buttonDisabled]} onPress={closeAnimalForm} disabled={isSavingAnimal}>
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryBtnSmall, isSavingAnimal && styles.buttonDisabled]} onPress={saveAnimal} disabled={isSavingAnimal}>
                        <Text style={styles.primaryBtnText}>
                          {isSavingAnimal ? 'Saving...' : animalForm.id ? 'Save Changes' : 'Create Animal'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <FlatList
                  data={animals}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={<RefreshControl refreshing={busyMessage === 'Refreshing...'} onRefresh={refreshActive} />}
                  renderItem={({ item }) => (
                    <View style={styles.rowCard}>
                      <Text style={styles.rowTitle}>{item.tag_id} {item.name ? `- ${item.name}` : ''}</Text>
                      <Text style={styles.rowMeta}>{item.species} • {item.gender} • {item.life_stage || 'Unknown'} • {item.animal_status}</Text>
                      {canEditData && (
                        <View style={styles.inlineActionsRow}>
                          <Pressable style={[styles.inlineActionBtn, isSavingAnimal && styles.buttonDisabled]} onPress={() => openAnimalEditForm(item)} disabled={isSavingAnimal}>
                            <Text style={styles.inlineActionText}>{isSavingAnimal && animalForm.id === item.id ? 'Editing...' : 'Edit'}</Text>
                          </Pressable>
                          {canManageUsers && (
                            <Pressable
                              style={[styles.inlineActionBtn, styles.inlineActionDangerBtn, deletingAnimalId === item.id && styles.buttonDisabled]}
                              onPress={() => deleteAnimal(item)}
                              disabled={deletingAnimalId === item.id}
                            >
                              <Text style={[styles.inlineActionText, styles.inlineActionDangerText]}>
                                {deletingAnimalId === item.id ? 'Deleting...' : 'Delete'}
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                />
              </View>
            )}

            {activeTab === 'breeding' && (
              <View style={styles.panel}>
                <SectionTitle title="Breeding Seasons" subtitle="Track and plan breeding cycles" />
                {canEditData ? (
                  <Pressable style={[styles.primaryBtnSmall, { alignSelf: 'flex-start', marginBottom: 12 }]} onPress={createSeason} disabled={isSavingEvent}>
                    <Text style={styles.primaryBtnText}>Quick Add Season</Text>
                  </Pressable>
                ) : null}
                <FlatList
                  data={seasons}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={<RefreshControl refreshing={busyMessage === 'Refreshing...'} onRefresh={refreshActive} />}
                  renderItem={({ item }) => (
                    <Pressable
                      style={[styles.rowCard, selectedSeason?.id === item.id && styles.rowCardSelected]}
                      onPress={async () => {
                        setSelectedSeason(item);
                        await loadSeasonDetail(item.id);
                      }}
                    >
                      <Text style={styles.rowTitle}>{item.name}</Text>
                      <Text style={styles.rowMeta}>Start: {item.start_date || '-'} • End: {item.end_date || '-'} • Events: {item.events_count}</Text>
                    </Pressable>
                  )}
                />

                {selectedSeason && seasonDetail && (
                  <View style={styles.formCard}>
                    <Text style={styles.formCardTitle}>Season Detail: {selectedSeason.name}</Text>
                    {canEditData && (
                      <Pressable style={[styles.primaryBtnSmall, { alignSelf: 'flex-start', marginBottom: 10 }, isSavingEvent && styles.buttonDisabled]} onPress={() => openEventForm()} disabled={isSavingEvent}>
                        <Text style={styles.primaryBtnText}>Add Mating Event</Text>
                      </Pressable>
                    )}

                    {eventFormVisible && (
                      <View style={styles.formCardInner}>
                        <Text style={styles.listHeading}>{eventForm.id ? 'Edit Event' : 'New Event'}</Text>
                        <LabeledInput
                          label="Find Ewe (tag or name)"
                          value={eweSearch}
                          onChangeText={setEweSearch}
                        />
                        <View style={styles.pickerList}>
                          {eweCandidates.map((a) => (
                            <Pressable
                              key={`ewe-${a.id}`}
                              style={[styles.pickerItem, String(a.id) === eventForm.ewe_id && styles.pickerItemSelected]}
                              onPress={() => setEventForm((prev) => ({ ...prev, ewe_id: String(a.id) }))}
                            >
                              <Text style={styles.pickerItemTitle}>{a.tag_id}</Text>
                              <Text style={styles.pickerItemMeta}>{a.name || 'Unnamed'} • {a.animal_status}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <FieldError message={eventFieldErrors.ewe_id} />

                        <LabeledInput
                          label="Find Sire (tag or name)"
                          value={sireSearch}
                          onChangeText={setSireSearch}
                        />
                        <View style={styles.pickerList}>
                          {sireCandidates.map((a) => (
                            <Pressable
                              key={`sire-${a.id}`}
                              style={[styles.pickerItem, String(a.id) === eventForm.sire_id && styles.pickerItemSelected]}
                              onPress={() => setEventForm((prev) => ({ ...prev, sire_id: String(a.id) }))}
                            >
                              <Text style={styles.pickerItemTitle}>{a.tag_id}</Text>
                              <Text style={styles.pickerItemMeta}>{a.name || 'Unnamed'} • {a.animal_status}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <FieldError message={eventFieldErrors.sire_id} />

                        <DateField
                          label="Exposure Date (YYYY-MM-DD)"
                          value={eventForm.exposure_date}
                          onPress={() => openDatePicker('event.exposure_date', eventForm.exposure_date)}
                          error={eventFieldErrors.exposure_date}
                        />
                        <DateField
                          label="Scan Date (optional)"
                          value={eventForm.scan_date}
                          onPress={() => openDatePicker('event.scan_date', eventForm.scan_date)}
                          error={eventFieldErrors.scan_date}
                        />
                        <LabeledInput
                          label="Scan Result (optional)"
                          value={eventForm.scan_result}
                          onChangeText={(v) => setEventForm((prev) => ({ ...prev, scan_result: v }))}
                        />
                        <DateField
                          label="Expected Due Date (optional)"
                          value={eventForm.expected_due_date}
                          onPress={() => openDatePicker('event.expected_due_date', eventForm.expected_due_date)}
                          error={eventFieldErrors.expected_due_date}
                        />
                        {eventFormError ? <Text style={styles.error}>{eventFormError}</Text> : null}
                        <View style={styles.formActionsRow}>
                          <Pressable style={[styles.secondaryBtnSmall, isSavingEvent && styles.buttonDisabled]} onPress={closeEventForm} disabled={isSavingEvent}>
                            <Text style={styles.secondaryBtnText}>Cancel</Text>
                          </Pressable>
                          <Pressable style={[styles.primaryBtnSmall, isSavingEvent && styles.buttonDisabled]} onPress={saveEvent} disabled={isSavingEvent}>
                            <Text style={styles.primaryBtnText}>{isSavingEvent ? 'Saving...' : eventForm.id ? 'Save Event' : 'Create Event'}</Text>
                          </Pressable>
                        </View>
                      </View>
                    )}

                    {(seasonDetail.events || []).map((event) => (
                      <View key={event.id} style={styles.rowCardCompact}>
                        <Text style={styles.rowTitle}>Ewe #{event.ewe_id} x Sire #{event.sire_id}</Text>
                        <Text style={styles.rowMeta}>Exposure: {event.exposure_date || '-'} • Scan: {event.scan_result || 'Not Scanned'}</Text>
                        {canEditData && (
                          <View style={styles.inlineActionsRow}>
                            <Pressable style={[styles.inlineActionBtn, isSavingEvent && styles.buttonDisabled]} onPress={() => openEventForm(event)} disabled={isSavingEvent}>
                              <Text style={styles.inlineActionText}>Edit</Text>
                            </Pressable>
                            {canManageUsers && (
                              <Pressable
                                style={[styles.inlineActionBtn, styles.inlineActionDangerBtn, deletingEventId === event.id && styles.buttonDisabled]}
                                onPress={() => deleteEvent(event.id)}
                                disabled={deletingEventId === event.id}
                              >
                                <Text style={[styles.inlineActionText, styles.inlineActionDangerText]}>
                                  {deletingEventId === event.id ? 'Deleting...' : 'Delete'}
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'users' && canManageUsers && (
              <View style={styles.panel}>
                <SectionTitle title="Users" subtitle="Manage access and roles" />
                <Pressable style={[styles.primaryBtnSmall, { alignSelf: 'flex-start', marginBottom: 12 }, isSavingUser && styles.buttonDisabled]} onPress={createUser} disabled={isSavingUser}>
                  <Text style={styles.primaryBtnText}>Add User</Text>
                </Pressable>

                {userFormVisible && (
                  <View style={styles.formCard}>
                    <Text style={styles.formCardTitle}>{userForm.id ? 'Edit User' : 'New User'}</Text>
                    <LabeledInput
                      label="Username"
                      value={userForm.username}
                      onChangeText={(v) => setUserForm((prev) => ({ ...prev, username: v }))}
                    />
                    <FieldError message={userFieldErrors.username} />
                    <LabeledInput
                      label="Email"
                      value={userForm.email}
                      onChangeText={(v) => setUserForm((prev) => ({ ...prev, email: v }))}
                    />
                    <FieldError message={userFieldErrors.email} />
                    <ChipSelector
                      label="Role"
                      options={['readonly', 'super_user', 'admin']}
                      value={userForm.role}
                      onSelect={(v) => setUserForm((prev) => ({ ...prev, role: v }))}
                    />
                    <FieldError message={userFieldErrors.role} />
                    <LabeledInput
                      label={userForm.id ? 'Password (leave blank to keep unchanged)' : 'Password'}
                      value={userForm.password}
                      onChangeText={(v) => setUserForm((prev) => ({ ...prev, password: v }))}
                      secureTextEntry
                    />
                    <FieldError message={userFieldErrors.password} />
                    {userFormError ? <Text style={styles.error}>{userFormError}</Text> : null}
                    <View style={styles.formActionsRow}>
                      <Pressable style={[styles.secondaryBtnSmall, isSavingUser && styles.buttonDisabled]} onPress={closeUserForm} disabled={isSavingUser}>
                        <Text style={styles.secondaryBtnText}>Cancel</Text>
                      </Pressable>
                      <Pressable style={[styles.primaryBtnSmall, isSavingUser && styles.buttonDisabled]} onPress={saveUser} disabled={isSavingUser}>
                        <Text style={styles.primaryBtnText}>{isSavingUser ? 'Saving...' : userForm.id ? 'Save User' : 'Create User'}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                <FlatList
                  data={users}
                  keyExtractor={(item) => String(item.id)}
                  refreshControl={<RefreshControl refreshing={busyMessage === 'Refreshing...'} onRefresh={refreshActive} />}
                  renderItem={({ item }) => (
                    <View style={styles.rowCard}>
                      <Text style={styles.rowTitle}>{item.username}</Text>
                      <Text style={styles.rowMeta}>{item.email} • {item.role}</Text>
                      <View style={styles.inlineActionsRow}>
                        <Pressable style={[styles.inlineActionBtn, isSavingUser && styles.buttonDisabled]} onPress={() => editUser(item)} disabled={isSavingUser}>
                          <Text style={styles.inlineActionText}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.inlineActionBtn, styles.inlineActionDangerBtn, deletingUserId === item.id && styles.buttonDisabled]}
                          onPress={() => deleteUser(item)}
                          disabled={deletingUserId === item.id}
                        >
                          <Text style={[styles.inlineActionText, styles.inlineActionDangerText]}>
                            {deletingUserId === item.id ? 'Deleting...' : 'Delete'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                />
              </View>
            )}
          </View>
        </View>

        {busyMessage ? <Text style={styles.busy}>{busyMessage}</Text> : null}
        {toast.visible ? (
          <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ) : null}
        {datePicker.visible && (
          <DateTimePicker
            value={datePicker.value}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (event.type === 'dismissed') {
                setDatePicker((prev) => ({ ...prev, visible: false }));
                return;
              }
              if (selectedDate) {
                applyDateValue(datePicker.target, selectedDate);
              }
              setDatePicker((prev) => ({ ...prev, visible: false }));
            }}
          />
        )}
        <StatusBar style="dark" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#eef6ef' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  loginCard: { margin: 20, backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#dbe7dc' },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  muted: { color: '#64748b', marginBottom: 8 },
  fieldWrap: { marginTop: 8 },
  fieldLabel: { color: '#334155', marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  dateInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputError: {
    borderColor: '#b91c1c',
  },
  dateInputText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  dateInputPlaceholder: {
    color: '#94a3b8',
    fontWeight: '500',
  },
  fieldError: {
    color: '#b91c1c',
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  chipSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#166534',
  },
  chipText: { color: '#334155', fontWeight: '600' },
  chipTextSelected: { color: '#166534' },
  primaryBtn: { marginTop: 12, backgroundColor: '#166534', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnSmall: { backgroundColor: '#166534', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.55 },
  secondaryBtnSmall: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#166534',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryBtnText: { color: '#166534', fontWeight: '700' },
  error: { color: '#b91c1c', marginTop: 8 },
  busy: { textAlign: 'center', color: '#166534', fontWeight: '700', paddingBottom: 8 },
  toast: {
    backgroundColor: '#166534',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastError: {
    backgroundColor: '#b91c1c',
  },
  toastText: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#dbe7dc', gap: 10 },
  menuBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#166534', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, gap: 6 },
  menuBtnText: { color: '#fff', fontWeight: '700' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b' },
  outlineBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#166534', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  body: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 240, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#dbe7dc', padding: 10, gap: 8 },
  sidebarCollapsed: { width: 62 },
  sideItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, gap: 10, backgroundColor: '#f8fafc' },
  sideItemActive: { backgroundColor: '#dcfce7' },
  sideItemText: { color: '#334155', fontWeight: '600' },
  content: { flex: 1, padding: 10 },
  panel: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#dbe7dc', padding: 12 },
  formCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 10,
  },
  formCardInner: {
    marginTop: 4,
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerList: {
    marginTop: 6,
    gap: 6,
  },
  pickerItem: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  pickerItemSelected: {
    backgroundColor: '#dcfce7',
    borderColor: '#166534',
  },
  pickerItemTitle: {
    color: '#0f172a',
    fontWeight: '700',
  },
  pickerItemMeta: {
    color: '#475569',
    marginTop: 2,
    fontSize: 12,
  },
  formCardTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  formActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  sectionTitleWrap: { marginBottom: 10 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  sectionSubtitle: { color: '#64748b', marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metricCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  metricLabel: { color: '#64748b', fontSize: 12 },
  metricValue: { color: '#0f172a', fontSize: 26, fontWeight: '700' },
  listHeading: { color: '#334155', fontWeight: '700', marginBottom: 8 },
  rowCard: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', padding: 10, marginBottom: 8 },
  rowCardSelected: { borderColor: '#166534', backgroundColor: '#ecfdf3' },
  rowCardCompact: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginTop: 8,
  },
  rowTitle: { color: '#0f172a', fontWeight: '700' },
  rowMeta: { color: '#475569', marginTop: 3 },
  inlineActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  inlineActionBtn: {
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineActionDangerBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  inlineActionText: { color: '#166534', fontWeight: '700', fontSize: 12 },
  inlineActionDangerText: { color: '#b91c1c' },
  toolbarRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
});
