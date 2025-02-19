const handlePhoneSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    // تنسيق رقم الهاتف للتأكد من أنه يبدأ بـ +966
    let formattedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      formattedPhone = '+' + phoneNumber;
    }
    if (!phoneNumber.startsWith('+966')) {
      formattedPhone = '+966' + phoneNumber.replace(/^0+/, '');
    }

    // إعادة تهيئة reCAPTCHA في حالة وجود خطأ سابق
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }

    // تهيئة reCAPTCHA
    const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: (response) => {
        console.log('reCAPTCHA resolved');
      },
      'expired-callback': () => {
        setError('انتهت صلاحية التحقق، يرجى المحاولة مرة أخرى');
      }
    });

    // إرسال رمز التحقق
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      recaptchaVerifier
    );
    
    window.confirmationResult = confirmationResult;
    setShowOTP(true);
    setLoading(false);
    
  } catch (error) {
    setLoading(false);
    console.error('Error:', error);
    
    // التعامل مع الأخطاء المختلفة
    switch (error.code) {
      case 'auth/invalid-phone-number':
        setError('رقم الهاتف غير صحيح');
        break;
      case 'auth/too-many-requests':
        setError('تم تجاوز عدد المحاولات المسموح بها. الرجاء المحاولة لاحقاً');
        break;
      case 'auth/captcha-check-failed':
        setError('فشل التحقق من reCAPTCHA. حاول مرة أخرى');
        break;
      default:
        setError('حدث خطأ. يرجى المحاولة مرة أخرى');
    }
  }
};

const verifyOTP = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const result = await window.confirmationResult.confirm(otp);
    // تم التحقق بنجاح
    const user = result.user;
    setLoading(false);
    // التوجيه إلى الصفحة الرئيسية أو أي إجراء آخر
    
  } catch (error) {
    setLoading(false);
    console.error('Error:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      setError('رمز التحقق غير صحيح');
    } else {
      setError('حدث خطأ في التحقق. يرجى المحاولة مرة أخرى');
    }
  }
}; 