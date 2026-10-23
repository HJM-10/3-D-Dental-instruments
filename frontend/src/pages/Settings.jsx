import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { UploadCloud, User, Mail, Lock, Save } from 'lucide-react';
import AppearancePanel from '../components/AppearancePanel';

const Settings = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const toast = useToast();

  const [name,         setName]         = useState(user.name || '');
  const [password,     setPassword]     = useState('');
  const [profileImage, setProfileImage] = useState(user.profile_image || '');
  const [saving,       setSaving]       = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File Too Large', 'Profile image must be less than 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmed = await toast.confirm(
      'Save Changes',
      'Are you sure you want to update your profile settings?',
      'info'
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      await updateProfile(name, password, profileImage);
      setPassword('');
      toast.success('Profile Updated', 'Your account settings have been saved successfully.');
    } catch {
      toast.error('Update Failed', 'Could not save your profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ fontSize: '2.25rem', marginBottom: '0.4rem' }}>
          Account Settings
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Manage your profile and security preferences.</p>
      </div>

      {['admin', 'super_admin'].includes(user.role) && <div className="card" style={{ marginBottom: '1.5rem' }}><AppearancePanel /></div>}
      <div className="card" style={{ padding: '2rem' }}>
        <form onSubmit={handleSubmit}>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
            <div style={{
              width: 96, height: 96,
              borderRadius: '50%',
              background: profileImage
                ? `url(${profileImage}) center/cover`
                : 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '3px solid var(--glass-border)',
              boxShadow: '0 0 0 4px var(--glow-primary), var(--neu-shadow-out)',
              overflow: 'hidden',
              fontSize: '1.5rem', fontWeight: 700, color: '#fff',
            }}>
              {!profileImage && initials}
            </div>

            <label
              className="btn btn-secondary"
              style={{ cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1.1rem' }}
              id="settings-upload-label"
            >
              <UploadCloud size={16} />
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="settings-image-upload"
              />
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Max 2 MB — JPG, PNG, WebP</p>
          </div>

          {/* Fields */}
          <div className="input-group">
            <label htmlFor="settings-name">Display Name</label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="settings-name"
                type="text"
                className="input-field has-icon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="settings-email">Email Address</label>
            <div className="input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="settings-email"
                type="email"
                className="input-field has-icon"
                value={user.email}
                disabled
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '2rem' }}>
            <label htmlFor="settings-password">New Password <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <div className="input-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="settings-password"
                type="password"
                className="input-field has-icon"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            id="settings-save-btn"
            style={{ width: '100%', padding: '0.9rem' }}
            disabled={saving}
          >
            {saving ? (
              <><span className="spinner" /> Saving...</>
            ) : (
              <><Save size={16} /> Save Changes</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
