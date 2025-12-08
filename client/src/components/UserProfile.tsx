import { useAppSelector, useAppDispatch } from '../store/hooks';
import { logout } from '../state/AuthSlice';

export default function UserProfile() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {user.picture && (
        <img
          src={user.picture}
          alt={user.name || 'User'}
          className="w-10 h-10 rounded-full"
        />
      )}
      <div>
        <p className="font-medium">{user.name || user.email}</p>
        <button
          onClick={() => dispatch(logout())}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}