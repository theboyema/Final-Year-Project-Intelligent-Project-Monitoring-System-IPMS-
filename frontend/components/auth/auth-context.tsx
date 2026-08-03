"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
  createUserWithEmailAndPassword, updatePassword, sendPasswordResetEmail,
  reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth';
import {
  doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../../lib/firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Role = 'STUDENT' | 'SUPERVISOR' | 'ADMIN' | null;
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED';

export type User = {
  id: string;
  email: string;
  password?: string;        // not stored in Firestore; kept for type compat
  name: string;
  role: Role;
  verified: boolean;
  course?: string;
  level?: string;
  studentId?: string;
  indexNumber?: string;
  department?: string;
  phone?: string;
  staffId?: string;
  supervisorId?: string;
  projectTitle?: string;
  status: UserStatus;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  verified: boolean;
  mustChangePassword?: boolean;
};

export interface CreateStudentData {
  name: string; email: string; password: string;
  studentId?: string; indexNumber?: string; department?: string;
  course?: string; level?: string; phone?: string;
  status?: UserStatus; mustChangePassword?: boolean;
}

export interface CreateLecturerData {
  name: string; email: string; password: string;
  staffId?: string; department?: string; phone?: string;
  status?: UserStatus; mustChangePassword?: boolean;
}

type AuthContextType = {
  user: SessionUser | null;
  hydrated: boolean;
  login:           (email: string, password: string) => Promise<void>;
  logout:          () => void;
  registerAdmin:   (name: string, email: string, password: string) => Promise<'approved' | 'pending'>;
  getAllUsers:      () => User[];
  getSupervisors:  () => User[];
  getPendingAdmins: () => User[];
  createStudent:   (data: CreateStudentData) => Promise<{ emailSent: boolean }>;
  createLecturer:  (data: CreateLecturerData) => Promise<{ emailSent: boolean }>;
  createAdmin:     (name: string, email: string, password: string) => Promise<void>;
  updateUser:      (id: string, fields: Partial<User>) => Promise<void>;
  deleteUser:      (id: string) => Promise<void>;
  changePassword:  (userId: string, currentPassword: string, newPassword: string) => Promise<void>;
  assignSupervisor:(studentId: string, supervisorId: string, projectTitle?: string) => Promise<void>;
  approveUser:     (userId: string) => Promise<void>;
  rejectUser:      (userId: string) => Promise<void>;
  sendLoginLink:   (email: string) => Promise<void>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToString(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  return new Date().toISOString();
}

function docToUser(id: string, data: any): User {
  return {
    id,
    email:             data.email ?? '',
    name:              data.name ?? '',
    role:              data.role ?? null,
    verified:          data.verified ?? false,
    status:            data.status ?? 'ACTIVE',
    mustChangePassword: data.mustChangePassword ?? false,
    course:            data.course ?? undefined,
    level:             data.level ?? undefined,
    studentId:         data.studentId ?? undefined,
    indexNumber:       data.indexNumber ?? undefined,
    department:        data.department ?? undefined,
    phone:             data.phone ?? undefined,
    staffId:           data.staffId ?? undefined,
    supervisorId:      data.supervisorId ?? undefined,
    projectTitle:      data.projectTitle ?? undefined,
    createdAt:         tsToString(data.createdAt),
    updatedAt:         data.updatedAt ? tsToString(data.updatedAt) : undefined,
  };
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user,     setUser]     = useState<SessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Reload the full users list from Firestore into state
  const loadAllUsers = async () => {
    const snap = await getDocs(collection(db, 'users'));
    setAllUsers(snap.docs.map(d => docToUser(d.id, d.data())));
  };

  // Watch Firebase Auth state — runs on mount and on every sign-in / sign-out
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (!snap.exists()) {
          // Doc not written yet (mid-registration) — stay signed in but show nothing
          setUser(null);
          setHydrated(true);
          return;
        }
        const data = snap.data();
        const session: SessionUser = {
          id:                firebaseUser.uid,
          email:             firebaseUser.email!,
          name:              data.name,
          role:              data.role,
          verified:          data.verified,
          mustChangePassword: data.mustChangePassword ?? false,
        };
        setUser(session);
        setHydrated(true);        // unblock the UI immediately
        loadAllUsers();           // load users in the background
      } else {
        setUser(null);
        setAllUsers([]);
        setHydrated(true);
      }
    });
    return () => unsub();
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<void> => {
    const norm = email.trim().toLowerCase();
    let uid: string;
    try {
      const cred = await signInWithEmailAndPassword(auth, norm, password);
      uid = cred.user.uid;
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Try again later.');
      }
      throw new Error('Login failed. Please try again.');
    }

    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error('Account not found. Contact your administrator.');
    }

    const data = snap.data();
    if (data.role === 'ADMIN' && !data.verified) {
      await signOut(auth);
      throw new Error('PENDING_APPROVAL');
    }
    if (data.status === 'INACTIVE' || data.status === 'DEACTIVATED') {
      await signOut(auth);
      throw new Error('Your account has been deactivated. Contact your administrator.');
    }
    if (!data.verified) {
      await signOut(auth);
      throw new Error('Your account is not yet active. Contact your administrator.');
    }
    // onAuthStateChanged handles setting user state
  };

  const logout = () => {
    signOut(auth);
    if (typeof window !== 'undefined') window.location.href = '/login';
  };

  // ── Admin self-registration ───────────────────────────────────────────────

  const registerAdmin = async (name: string, email: string, password: string): Promise<'approved' | 'pending'> => {
    const norm = email.trim().toLowerCase();

    // 1. Create Firebase Auth user FIRST so we are authenticated for Firestore queries
    const cred = await createUserWithEmailAndPassword(auth, norm, password);

    // 2. Now authenticated — check if any verified admin exists (bootstrap detection)
    const adminQ = query(
      collection(db, 'users'),
      where('role', '==', 'ADMIN'),
      where('verified', '==', true),
      where('status', '==', 'ACTIVE'),
    );
    const existing = await getDocs(adminQ);
    const isBootstrap = existing.empty;

    // 3. Write Firestore profile
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: norm,
      name:  name.trim(),
      role:  'ADMIN',
      verified: isBootstrap,
      status: isBootstrap ? 'ACTIVE' : 'INACTIVE',
      createdAt: serverTimestamp(),
    });

    if (!isBootstrap) {
      // Pending approval — sign out and let admin approve
      await signOut(auth);
      return 'pending';
    }

    // Bootstrap: set user state directly (onAuthStateChanged may have fired before doc was written)
    setUser({ id: cred.user.uid, email: norm, name: name.trim(), role: 'ADMIN', verified: true });
    await loadAllUsers();
    return 'approved';
  };

  // ── Admin creates accounts ────────────────────────────────────────────────

  const createAdmin = async (name: string, email: string, password: string): Promise<void> => {
    const norm = email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, norm, password);
    await signOut(secondaryAuth);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: norm, name: name.trim(),
      role: 'ADMIN', verified: true, status: 'ACTIVE',
      mustChangePassword: true,
      createdAt: serverTimestamp(),
    });
    await loadAllUsers();
  };

  // Shared helper — waits for Firebase Auth to propagate a new account then sends the reset email.
  // The 1.5s delay prevents the race condition where sendPasswordResetEmail fires before the new
  // account is visible to Firebase's email service, causing a silent auth/user-not-found failure.
  const sendWelcomeResetEmail = async (email: string, uid: string): Promise<boolean> => {
    const continueUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    const actionCodeSettings = continueUrl ? {
      url: continueUrl,
      handleCodeInApp: false,
    } : undefined;
    // Wait for Firebase Auth to fully propagate the newly-created account
    await new Promise(r => setTimeout(r, 1500));
    try {
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      await updateDoc(doc(db, 'users', uid), { mustChangePassword: false });
      return true;
    } catch (err: any) {
      console.error('[auth] sendWelcomeResetEmail failed:', err?.code, err?.message);
      return false;
    }
  };

  const createStudent = async (data: CreateStudentData): Promise<{ emailSent: boolean }> => {
    const norm = data.email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, norm, data.password);
    await signOut(secondaryAuth);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: norm, name: data.name.trim(),
      role: 'STUDENT', verified: true,
      status: data.status ?? 'ACTIVE',
      mustChangePassword: data.mustChangePassword ?? true,
      course:      data.course      ?? null,
      level:       data.level       ?? null,
      studentId:   data.studentId   ?? null,
      indexNumber: data.indexNumber ?? null,
      department:  data.department  ?? null,
      phone:       data.phone       ?? null,
      createdAt: serverTimestamp(),
    });
    const emailSent = await sendWelcomeResetEmail(norm, cred.user.uid);
    await loadAllUsers();
    return { emailSent };
  };

  const createLecturer = async (data: CreateLecturerData): Promise<{ emailSent: boolean }> => {
    const norm = data.email.trim().toLowerCase();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, norm, data.password);
    await signOut(secondaryAuth);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: norm, name: data.name.trim(),
      role: 'SUPERVISOR', verified: true,
      status: data.status ?? 'ACTIVE',
      mustChangePassword: data.mustChangePassword ?? true,
      staffId:    data.staffId    ?? null,
      department: data.department ?? null,
      phone:      data.phone      ?? null,
      createdAt: serverTimestamp(),
    });
    const emailSent = await sendWelcomeResetEmail(norm, cred.user.uid);
    await loadAllUsers();
    return { emailSent };
  };

  // Sends a Firebase "set/reset password" email to any registered address
  const sendLoginLink = async (email: string): Promise<void> => {
    const continueUrl = typeof window !== 'undefined' ? `${window.location.origin}/login` : '';
    await sendPasswordResetEmail(auth, email.trim().toLowerCase(), continueUrl ? { url: continueUrl, handleCodeInApp: false } : undefined);
  };

  // ── Getters (sync — reads from allUsers state) ────────────────────────────

  const getAllUsers       = useCallback((): User[] => allUsers, [allUsers]);
  const getSupervisors   = useCallback((): User[] => allUsers.filter(u => u.role === 'SUPERVISOR' && u.status !== 'DEACTIVATED'), [allUsers]);
  const getPendingAdmins = useCallback((): User[] => allUsers.filter(u => u.role === 'ADMIN' && !u.verified), [allUsers]);

  // ── Updates ───────────────────────────────────────────────────────────────

  const updateUser = async (id: string, fields: Partial<User>): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, id: _id, createdAt, ...safeFields } = fields as any;
    await updateDoc(doc(db, 'users', id), { ...safeFields, updatedAt: serverTimestamp() });
    if (user?.id === id) {
      const snap = await getDoc(doc(db, 'users', id));
      const d = snap.data()!;
      setUser({ id, email: d.email, name: d.name, role: d.role, verified: d.verified, mustChangePassword: d.mustChangePassword });
    }
    await loadAllUsers();
  };

  const deleteUser = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'users', id));
    await loadAllUsers();
    if (user?.id === id) logout();
  };

  const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    if (userId !== user?.id || !auth.currentUser)
      throw new Error('You can only change your own password.');
    const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, credential);
    await updatePassword(auth.currentUser, newPassword);
    await updateDoc(doc(db, 'users', userId), { mustChangePassword: false, updatedAt: serverTimestamp() });
    setUser(prev => prev ? { ...prev, mustChangePassword: false } : null);
  };

  const assignSupervisor = async (studentId: string, supervisorId: string, projectTitle?: string): Promise<void> => {
    const updates: Record<string, any> = { supervisorId, updatedAt: serverTimestamp() };
    if (projectTitle !== undefined) updates.projectTitle = projectTitle;
    await updateDoc(doc(db, 'users', studentId), updates);
    // Notify student of new assignment
    if (supervisorId) {
      const supUser = allUsers.find(u => u.id === supervisorId);
      await addDoc(collection(db, 'notifications'), {
        userId: studentId, type: 'ASSIGNMENT', read: false,
        title: 'Supervisor Assigned',
        message: supUser
          ? `${supUser.name} has been assigned as your project supervisor.`
          : 'A supervisor has been assigned to your project.',
        link: '/student',
        createdAt: serverTimestamp(),
      });
    }
    await loadAllUsers();
  };

  const approveUser = async (userId: string): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { verified: true, status: 'ACTIVE', updatedAt: serverTimestamp() });
    await loadAllUsers();
  };

  const rejectUser = async (userId: string): Promise<void> => {
    await deleteDoc(doc(db, 'users', userId));
    await loadAllUsers();
  };

  return (
    <AuthContext.Provider value={{
      user, hydrated, login, logout, registerAdmin, getAllUsers, getSupervisors,
      getPendingAdmins, createStudent, createLecturer, createAdmin,
      updateUser, deleteUser, changePassword, assignSupervisor, approveUser, rejectUser,
      sendLoginLink,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
