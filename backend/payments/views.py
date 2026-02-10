import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Payment
from django.utils import timezone

# Load Stripe key
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    try:
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': 999,  # $9.99 in cents
                    'product_data': {
                        'name': 'Premium Subscription',
                        'description': 'Unlimited tasks + Focus Timer',
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='http://localhost:3000/pricing',
            client_reference_id=str(request.user.id),
        )
        
        return Response({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    session_id = request.data.get('session_id')
    
    try:
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        if session.payment_status == 'paid':
            # Update user to premium
            user = request.user
            user.is_premium = True
            user.subscription_date = timezone.now()
            user.save()
            
            # Save payment record
            Payment.objects.create(
                user=user,
                stripe_payment_intent_id=session.payment_intent,
                amount=9.99,
                status='completed'
            )
            
            return Response({
                'success': True,
                'message': 'Payment verified! You are now premium.'
            })
        else:
            return Response({
                'success': False,
                'message': 'Payment not completed'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)