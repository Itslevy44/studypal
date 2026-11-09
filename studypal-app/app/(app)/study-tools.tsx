import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { Card } from '../../components/ui/Card';
import { GradientButton } from '../../components/ui/GradientButton';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import type { Palette } from '../../constants/theme';
import { RADIUS } from '../../constants';

type Tab = 'timer' | 'exams' | 'gpa';

/** Small persisted-state helper (AsyncStorage + JSON). */
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => { if (raw) setValue(JSON.parse(raw)); })
      .catch(() => {})
      .finally(() => { loaded.current = true; });
  }, [key]);
  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
  }, [key, value]);
  return [value, setValue] as const;
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
const todayKey = () => new Date().toISOString().slice(0, 10);

// Keeps the screen on while mounted (rendered only while a session runs)
function KeepAwake() { useKeepAwake(); return null; }

// ───────────────────────────── Focus timer ─────────────────────────────
const PRESETS = [
  { label: '25 / 5', focus: 25, rest: 5 },
  { label: '50 / 10', focus: 50, rest: 10 },
  { label: '15 / 3', focus: 15, rest: 3 },
];

function FocusTimer() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const [preset, setPreset] = useState(0);
  const [phase, setPhase] = useState<'focus' | 'rest'>('focus');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(PRESETS[0].focus * 60);
  const endAt = useRef<number | null>(null);
  const [log, setLog] = usePersisted<{ day: string; sessions: number; minutes: number }>(
    'sp_focus_log', { day: todayKey(), sessions: 0, minutes: 0 }
  );

  const today = log.day === todayKey() ? log : { day: todayKey(), sessions: 0, minutes: 0 };
  const total = (phase === 'focus' ? PRESETS[preset].focus : PRESETS[preset].rest) * 60;

  const finishPhase = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (phase === 'focus') {
      setLog((l) => {
        const base = l.day === todayKey() ? l : { day: todayKey(), sessions: 0, minutes: 0 };
        return { ...base, sessions: base.sessions + 1, minutes: base.minutes + PRESETS[preset].focus };
      });
      toast.show('Focus session complete. Take a break!', 'success');
      setPhase('rest');
      setRemaining(PRESETS[preset].rest * 60);
    } else {
      toast.show('Break over. Ready for another round?', 'info');
      setPhase('focus');
      setRemaining(PRESETS[preset].focus * 60);
    }
    setRunning(false);
    endAt.current = null;
  }, [phase, preset, setLog, toast]);

  useEffect(() => {
    if (!running) return;
    if (endAt.current === null) endAt.current = Date.now() + remaining * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) finishPhase();
    }, 500);
    return () => clearInterval(id);
  }, [running, finishPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (running) { endAt.current = null; }
    setRunning((r) => !r);
  };
  const reset = () => {
    setRunning(false); endAt.current = null; setPhase('focus');
    setRemaining(PRESETS[preset].focus * 60);
  };
  const choose = (i: number) => {
    setPreset(i); setRunning(false); endAt.current = null; setPhase('focus');
    setRemaining(PRESETS[i].focus * 60);
  };

  const progress = total > 0 ? 1 - remaining / total : 0;

  return (
    <View>
      {running && <KeepAwake />}
      <View style={styles.segment}>
        {PRESETS.map((p, i) => (
          <TouchableOpacity key={p.label} style={[styles.segmentItem, preset === i && styles.segmentItemActive]} onPress={() => choose(i)}>
            <Text style={[styles.segmentText, preset === i && styles.segmentTextActive]}>{p.label} min</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Card style={styles.timerCard} elevated>
        <Text style={[styles.phase, { color: phase === 'focus' ? colors.primary : colors.success }]}>
          {phase === 'focus' ? 'FOCUS' : 'BREAK'}
        </Text>
        <Text style={styles.clock}>{fmt(remaining)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: phase === 'focus' ? colors.primary : colors.success }]} />
        </View>
        <View style={styles.row}>
          <GradientButton label={running ? 'Pause' : remaining < total ? 'Resume' : 'Start'} onPress={toggle} style={{ flex: 1 }} />
          <GradientButton label="Reset" variant="ghost" onPress={reset} style={{ flex: 0.6 }} />
        </View>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.stat}><Text style={styles.statValue}>{today.sessions}</Text><Text style={styles.statLabel}>Sessions today</Text></Card>
        <Card style={styles.stat}><Text style={styles.statValue}>{today.minutes}</Text><Text style={styles.statLabel}>Focus minutes</Text></Card>
      </View>
    </View>
  );
}

// ───────────────────────────── Exam countdown ─────────────────────────────
interface Exam { id: string; course: string; date: string } // date = ISO

function daysUntil(iso: string) {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(iso); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function ExamCountdown() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const toast = useToast();
  const [exams, setExams] = usePersisted<Exam[]>('sp_exams', []);
  const [course, setCourse] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 14 * 86400000));
  const [showPicker, setShowPicker] = useState(false);

  const sorted = useMemo(
    () => [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [exams]
  );

  const add = () => {
    if (!course.trim()) { toast.show('Enter a course or exam name', 'error'); return; }
    setExams((e) => [...e, { id: `${Date.now()}`, course: course.trim(), date: date.toISOString() }]);
    setCourse('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <View>
      <Card style={styles.formCard}>
        <Text style={styles.cardTitle}>Add an exam</Text>
        <TextInput
          style={styles.field}
          placeholder="Course, e.g. COMP 414"
          placeholderTextColor={colors.text.muted}
          value={course}
          onChangeText={setCourse}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.field} onPress={() => setShowPicker(true)}>
          <Text style={{ color: colors.text.primary, fontSize: 14, fontWeight: '500' }}>
            {date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
          </Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDate(d); }}
          />
        )}
        <GradientButton label="Add exam" onPress={add} small />
      </Card>

      {sorted.length === 0 ? (
        <Card style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color={colors.text.muted} />
          <Text style={styles.emptyText}>No exams yet. Add one to start the countdown.</Text>
        </Card>
      ) : sorted.map((e) => {
        const d = daysUntil(e.date);
        const tone = d < 0 ? colors.text.muted : d <= 3 ? colors.error : d <= 14 ? colors.warning : colors.success;
        return (
          <Card key={e.id} style={styles.examRow}>
            <View style={[styles.daysBox, { borderColor: tone }]}>
              <Text style={[styles.daysNum, { color: tone }]}>{d < 0 ? '–' : d}</Text>
              <Text style={styles.daysLbl}>{d === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.examName} numberOfLines={1}>{e.course}</Text>
              <Text style={styles.examDate}>
                {d < 0 ? 'Done · ' : d === 0 ? 'Today · ' : ''}
                {new Date(e.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity hitSlop={12} onPress={() => setExams((x) => x.filter((y) => y.id !== e.id))} accessibilityLabel={`Delete ${e.course}`}>
              <Ionicons name="trash-outline" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </Card>
        );
      })}
    </View>
  );
}

// ───────────────────────────── GPA calculator ─────────────────────────────
const SCALES = {
  '4.0': { A: 4, B: 3, C: 2, D: 1, E: 0 },
  '5.0': { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 },
} as const;
type ScaleKey = keyof typeof SCALES;
interface GpaRow { id: string; name: string; units: string; grade: string }

function GpaCalculator() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [scale, setScale] = usePersisted<ScaleKey>('sp_gpa_scale', '4.0');
  const [rows, setRows] = usePersisted<GpaRow[]>('sp_gpa_rows', [
    { id: '1', name: '', units: '3', grade: 'A' },
  ]);
  const points = SCALES[scale] as Record<string, number>;
  const grades = Object.keys(points);

  const update = (id: string, patch: Partial<GpaRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const { gpa, totalUnits } = useMemo(() => {
    let pts = 0, units = 0;
    for (const r of rows) {
      const u = parseFloat(r.units);
      const p = points[r.grade];
      if (!isFinite(u) || u <= 0 || p === undefined) continue;
      pts += u * p; units += u;
    }
    return { gpa: units ? pts / units : 0, totalUnits: units };
  }, [rows, points]);

  return (
    <View>
      <Card style={styles.gpaHero} elevated>
        <Text style={styles.gpaLabel}>Semester GPA ({scale} scale)</Text>
        <Text style={styles.gpaValue}>{totalUnits ? gpa.toFixed(2) : '—'}</Text>
        <Text style={styles.gpaSub}>{totalUnits} unit{totalUnits === 1 ? '' : 's'} counted</Text>
      </Card>

      <View style={styles.segment}>
        {(Object.keys(SCALES) as ScaleKey[]).map((k) => (
          <TouchableOpacity key={k}
            style={[styles.segmentItem, scale === k && styles.segmentItemActive]}
            onPress={() => {
              setScale(k);
              setRows((r) => r.map((x) => (k in SCALES && x.grade in SCALES[k] ? x : { ...x, grade: 'A' })));
            }}>
            <Text style={[styles.segmentText, scale === k && styles.segmentTextActive]}>{k} scale</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>Check your university's grading scale. Grade points differ between institutions.</Text>

      {rows.map((r, i) => (
        <Card key={r.id} style={styles.gpaRow}>
          <View style={styles.gpaTop}>
            <TextInput
              style={[styles.field, { flex: 1, marginBottom: 0 }]}
              placeholder={`Course ${i + 1}`}
              placeholderTextColor={colors.text.muted}
              value={r.name}
              onChangeText={(t) => update(r.id, { name: t })}
            />
            <TextInput
              style={[styles.field, { width: 64, marginBottom: 0, textAlign: 'center' }]}
              placeholder="Units"
              placeholderTextColor={colors.text.muted}
              keyboardType="decimal-pad"
              value={r.units}
              onChangeText={(t) => update(r.id, { units: t })}
            />
            {rows.length > 1 && (
              <TouchableOpacity hitSlop={10} onPress={() => setRows((x) => x.filter((y) => y.id !== r.id))} accessibilityLabel="Remove course">
                <Ionicons name="close-circle" size={22} color={colors.text.muted} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.gradeRow}>
            {grades.map((g) => (
              <TouchableOpacity key={g} style={[styles.gradeChip, r.grade === g && styles.gradeChipActive]} onPress={() => update(r.id, { grade: g })}>
                <Text style={[styles.gradeText, r.grade === g && styles.gradeTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      ))}

      <GradientButton
        label="Add course"
        variant="ghost"
        onPress={() => setRows((r) => [...r, { id: `${Date.now()}`, name: '', units: '3', grade: 'A' }])}
      />
    </View>
  );
}

// ───────────────────────────── Screen ─────────────────────────────
export default function StudyToolsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'exams' || params.tab === 'gpa' ? params.tab : 'timer');
  const tabs: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'timer', label: 'Focus', icon: 'timer-outline' },
    { key: 'exams', label: 'Exams', icon: 'calendar-outline' },
    { key: 'gpa', label: 'GPA', icon: 'calculator-outline' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Study tools</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Ionicons name={t.icon} size={17} color={tab === t.key ? '#fff' : colors.text.secondary} />
            <Text style={[styles.tabText, tab === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab === 'timer' && <FocusTimer />}
        {tab === 'exams' && <ExamCountdown />}
        {tab === 'gpa' && <GpaCalculator />}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 18, fontWeight: '800', color: c.text.primary },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 8 },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: c.surfaceAlt },
  tabActive: { backgroundColor: c.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: c.text.secondary },
  scroll: { padding: 20, paddingBottom: 48 },
  segment: { flexDirection: 'row', backgroundColor: c.surfaceAlt, borderRadius: RADIUS.lg, padding: 4, gap: 4, marginBottom: 16 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.md },
  segmentItemActive: { backgroundColor: c.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: c.text.secondary },
  segmentTextActive: { color: '#fff' },
  // timer
  timerCard: { alignItems: 'center', padding: 28, marginBottom: 16, gap: 14 },
  phase: { fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  clock: { fontSize: 64, fontWeight: '900', color: c.text.primary, fontVariant: ['tabular-nums'] },
  track: { height: 8, alignSelf: 'stretch', borderRadius: 4, backgroundColor: c.border, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, alignItems: 'center', padding: 16 },
  statValue: { fontSize: 30, fontWeight: '900', color: c.text.primary },
  statLabel: { fontSize: 11, fontWeight: '700', color: c.text.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  // forms / exams
  formCard: { gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: c.text.primary },
  field: {
    borderWidth: 1, borderColor: c.border, backgroundColor: c.background, borderRadius: RADIUS.md,
    paddingHorizontal: 14, height: 46, justifyContent: 'center', color: c.text.primary, fontSize: 14, fontWeight: '500', marginBottom: 2,
  },
  empty: { alignItems: 'center', padding: 32, gap: 10 },
  emptyText: { fontSize: 13, color: c.text.secondary, textAlign: 'center' },
  examRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10, padding: 14 },
  daysBox: { width: 56, height: 56, borderRadius: RADIUS.lg, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  daysNum: { fontSize: 20, fontWeight: '900' },
  daysLbl: { fontSize: 10, fontWeight: '700', color: c.text.muted, textTransform: 'uppercase' },
  examName: { fontSize: 15, fontWeight: '700', color: c.text.primary },
  examDate: { fontSize: 12, color: c.text.secondary, marginTop: 2 },
  // gpa
  gpaHero: { alignItems: 'center', padding: 24, marginBottom: 16 },
  gpaLabel: { fontSize: 12, fontWeight: '700', color: c.text.muted, textTransform: 'uppercase', letterSpacing: 1 },
  gpaValue: { fontSize: 56, fontWeight: '900', color: c.primary, marginVertical: 4 },
  gpaSub: { fontSize: 12, color: c.text.secondary },
  hint: { fontSize: 12, color: c.text.muted, marginBottom: 14, marginTop: -6 },
  gpaRow: { marginBottom: 10, padding: 14, gap: 12 },
  gpaTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gradeRow: { flexDirection: 'row', gap: 8 },
  gradeChip: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: c.surfaceAlt },
  gradeChipActive: { backgroundColor: c.primary },
  gradeText: { fontWeight: '800', color: c.text.secondary },
  gradeTextActive: { color: '#fff' },
});
