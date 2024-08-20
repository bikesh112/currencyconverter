# project/urls.py or app/urls.py (depending on your project structure)
from django.urls import path, include
from .views import GetRatesView, GetOptionsView, LoginView, LogoutView, SignUpView 

urlpatterns = [
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    path('api/get-rates/', GetRatesView.as_view(), name='get-rates'),
    path('api/get-options/', GetOptionsView.as_view(), name='get-options'),
    path('api/signup/', SignUpView.as_view(), name='signup'),
    path('api/login/', LoginView.as_view(), name='login'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
]
