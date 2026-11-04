from django.contrib.auth import password_validation
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Read model. Billing fields are strictly read-only."""

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'email_verified', 'is_premium',
                  'subscription_status', 'premium_until', 'cancel_at_period_end', 'date_joined']
        read_only_fields = fields


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username']

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError('This username is taken.')
        return value


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(max_length=254)  # no UniqueValidator: duplicates are handled silently in the view
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    class Meta:
        model = User
        fields = ['username', 'email', 'password']  # is_premium & co. are NOT accepted

    def validate_email(self, value):
        # Uniform response: do not reveal which e-mails are registered (see view).
        return value.strip().lower()

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is taken.')
        return value

    def validate(self, attrs):
        probe = User(username=attrs.get('username'), email=attrs.get('email'))
        try:
            password_validation.validate_password(attrs['password'], probe)
        except Exception as exc:  # DjangoValidationError
            raise serializers.ValidationError({'password': list(getattr(exc, 'messages', [str(exc)]))})
        return attrs


class EmailOnlySerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=False, allow_blank=True, trim_whitespace=False)
