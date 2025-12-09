import { GoogleLogin } from '@react-oauth/google';
import { useAppDispatch } from '../store/hooks';
import { googleLogin } from '../state/AuthSlice';

export default function GoogleSignInButton() {
  const dispatch = useAppDispatch();

  const handleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      await dispatch(googleLogin(credentialResponse.credential));
    }
  };

  const handleError = () => {
    console.error('Google Sign-In failed');
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      theme="outline"
      size="medium"
      text="signin"
      shape="pill"
    />
  );
}