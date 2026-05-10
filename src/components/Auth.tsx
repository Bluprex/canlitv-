import { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { LogIn, Mail, Lock, User as UserIcon, Loader2 } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor!");
            setLoading(false);
            return;
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          email: result.user.email,
          displayName: displayName || 'Misafir',
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || 'Misafir',
          photoURL: result.user.photoURL || '',
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
      <div className="relative z-10 text-white">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black tracking-tighter mb-2 italic uppercase">
            {isLogin ? 'GİRİŞ YAP' : 'KAYIT OL'}
          </h2>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" placeholder="AD SOYAD" required value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 text-xs font-bold uppercase"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="email" placeholder="E-POSTA" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 text-xs font-bold uppercase"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
            <input 
              type="password" placeholder="ŞİFRE" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 text-xs font-bold uppercase"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="password" placeholder="ŞİFRE TEKRAR" required value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary/50 text-xs font-bold uppercase"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold p-4 rounded-xl text-center uppercase">
              {error}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : (isLogin ? 'OTURUM AÇ' : 'HESAP OLUŞTUR')}
          </button>
        </form>

        <button 
          onClick={handleGoogleSignIn} disabled={loading}
          className="w-full mt-4 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 flex items-center justify-center gap-3 hover:bg-zinc-200 transition-colors"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
          GOOGLE İLE DEVAM ET
        </button>

        <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="w-full mt-8 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors">
          {isLogin ? 'HESABINIZ YOK MU? KAYIT OLUN' : 'HESABINIZ VAR MI? GİRİŞ YAPIN'}
        </button>
      </div>
    </div>
  );
}
