from datetime import datetime

import MetaTrader5 as mt
import numpy as np
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm, UserCreationForm
from django.contrib.auth.models import User
from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

from .forms import LoginForm, SignUpForm
from .serializers import (GroupSerializer, RatesRequestSerializer,
                          UserSerializer)


class SignUpView(APIView):
    def post(self, request):
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return Response({"message": "User created successfully"}, status=status.HTTP_201_CREATED)
        print(form.errors)
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    def post(self, request):
        form = LoginForm(data=request.data)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return Response({"message": "User logged in successfully"}, status=status.HTTP_200_OK)
        return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "User logged out successfully"}, status=status.HTTP_200_OK)

class GetRatesView(APIView):
    def post(self, request):
        serializer = RatesRequestSerializer(data=request.data)
        if serializer.is_valid():
            ticker = serializer.validated_data['ticker']
            interval = serializer.validated_data['interval']
            no_of_rows_list = [10, 15, 20, 25, 30, 35, 40, 50]

            try:

                login = 212971611
                password = 'XEJq7&a6'
                server = 'OctaFX-Demo'
                # Initialize MetaTrader5
                if not mt.initialize(login=login, server=server, password=password):
                    return Response({"error": "MetaTrader5 initialization failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                if not mt.login(login, password, server):
                    return Response({"error": "MetaTrader5 login failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

                from_date = datetime.now()

                def get_interval_seconds(interval):
                    # Define available intervals
                    intervals_in_seconds = {
                        mt.TIMEFRAME_M1: 60,
                        mt.TIMEFRAME_M5: 300,
                        mt.TIMEFRAME_M15: 900,
                        mt.TIMEFRAME_M30: 1800,
                        mt.TIMEFRAME_H1: 3600,
                        mt.TIMEFRAME_H4: 14400,
                        mt.TIMEFRAME_D1: 86400,
                        mt.TIMEFRAME_W1: 604800,
                        mt.TIMEFRAME_MN1: 2592000
                    }

                    reverse_intervals = {
                        'Within 2 days': mt.TIMEFRAME_M1,
                        'Within 2-4 days': mt.TIMEFRAME_M5,
                        'Within 4-7 days': mt.TIMEFRAME_M15,
                        'Within 1-2 Week': mt.TIMEFRAME_M30,
                        'Within 2-3 Week': mt.TIMEFRAME_H1,
                        'Within 1 Month': mt.TIMEFRAME_H4,
                        'Within 2 Months': mt.TIMEFRAME_D1,
                        'Within 4 Months': mt.TIMEFRAME_W1,
                        'Within 4-12 Months': mt.TIMEFRAME_MN1
                    }

                    mt_interval = reverse_intervals.get(interval, mt.TIMEFRAME_M1)
                    return intervals_in_seconds.get(mt_interval, 60), mt_interval

                interval_seconds, mt_interval = get_interval_seconds(interval)

                def get_slope_thresholds(interval):
                    thresholds = {
                        mt.TIMEFRAME_M1: (1e-7, -1.5e-7),
                        mt.TIMEFRAME_M5: (1e-7, -1.5e-7),
                        mt.TIMEFRAME_M15: (1e-7, -1.5e-7),
                        mt.TIMEFRAME_M30: (1e-8, -1e-8),
                        mt.TIMEFRAME_H1: (0.95e-7, -0.9e-8),
                        mt.TIMEFRAME_H4: (0.95e-8, -1.5e-8),
                        mt.TIMEFRAME_D1: (1e-8, -1.5e-9),
                        mt.TIMEFRAME_W1: (0.95e-9, -1.5e-9),
                        mt.TIMEFRAME_MN1: (1.1e-9, -1.2e-9)
                    }
                    return thresholds.get(interval, (1e-7, -1.5e-7))

                uptrend_threshold, downtrend_threshold = get_slope_thresholds(mt_interval)

                response_data = {}
                trend_counts = {'uptrend': 0, 'downtrend': 0, 'neutral': 0}

                for no_of_rows in no_of_rows_list:
                    rates = mt.copy_rates_from(ticker, mt_interval, from_date, no_of_rows)

                    if rates is None:
                        continue

                    timestamps = np.array([rate[0] for rate in rates]).reshape(-1, 1)
                    prices = np.array([rate[4] for rate in rates])

                    # Normalize timestamps bysubtracting the first timestamp
                    normalized_timestamps = timestamps - timestamps[0]
                    degree = 3
                    polynomial_features = PolynomialFeatures(degree=degree)
                    linear_regression = LinearRegression()
                    model = make_pipeline(polynomial_features, linear_regression)
                    model.fit(normalized_timestamps, prices)

                    # Predict future prices
                    last_timestamp = normalized_timestamps[-1][0]
                    future_timestamps = np.array([last_timestamp + (i * interval_seconds) for i in range(1, 11)]).reshape(-1, 1)
                    future_prices = model.predict(future_timestamps)

                    combined_timestamps = np.concatenate((normalized_timestamps, future_timestamps))
                    combined_prices = np.concatenate((prices, future_prices))

                    # Calculate the slope using normalized timestamps
                    slope = (future_prices[-1] - future_prices[0]) / (future_timestamps[-1] - future_timestamps[0])
                    slope = slope.item()
                    slope_degrees = np.degrees(np.arctan(slope))

                    print(f'Slope: {slope}')
                    print(f'Slope Degrees: {slope_degrees}')

                    if slope > uptrend_threshold:
                        trend = 'uptrend'
                        message = "Uptrend detected"
                    elif slope < downtrend_threshold:
                        trend = 'downtrend'
                        message = "Downtrend detected"
                    else:
                        trend = 'neutral'
                        message = "Neutral Trend"

                    trend_counts[trend] += 1

                    response_data[f'{no_of_rows}_rows'] = {
                        'historical': list(zip(normalized_timestamps.flatten(), prices)),
                        'predicted': list(zip(combined_timestamps.flatten(), combined_prices)),
                        'message': message,
                        'trend': trend
                    }

                majority_trend = max(trend_counts, key=trend_counts.get)
                majority_message = ""
                if trend_counts[majority_trend] >= len(no_of_rows_list) / 2:
                    if majority_trend == 'downtrend':
                        majority_message = "Final Verdict: Exchange the currency now to get the best value."
                    elif majority_trend == 'uptrend':
                        majority_message = "Final Verdict: Wait for the price to drop before exchanging the currency."
                    else:
                        majority_message = "Final Verdict: You can exchange the currency anytime as the exchange rate will not have significant changes."
                else:
                    majority_message = 'Since There is no significant bias towards one trend, the price action is questionable at current time for this analysis, hence there is no conclusive verdict at this time.'
                response_data['majority_trend'] = majority_trend
                response_data['majority_message'] = majority_message

                return Response(response_data, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            finally:
                mt.shutdown()

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class GetOptionsView(APIView):
    def get(self, request):
        try:
            # Initialize MetaTrader5
            if not mt.initialize():
                return Response({"error": "MetaTrader5 initialization failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            login = 212971611
            password = 'XEJq7&a6'
            server = 'OctaFX-Demo'
            if not mt.login(login, password, server):
                return Response({"error": "MetaTrader5 login failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Get available tickers
            symbols = mt.symbols_get()
            tickers = [symbol.name for symbol in symbols]

            intervals = {
                'Within 2 days': mt.TIMEFRAME_M1,
                'Within 2-4 days': mt.TIMEFRAME_M5,
                'Within 4-7 days': mt.TIMEFRAME_M15,
                'Within 1-2 Week': mt.TIMEFRAME_M30,
                'Within 2-3 Week': mt.TIMEFRAME_H1,
                'Within 1 Month': mt.TIMEFRAME_H4,
                'Within 2 Months': mt.TIMEFRAME_D1,
                'Within 4 Months': mt.TIMEFRAME_W1,
                'Within 4-12 Months': mt.TIMEFRAME_MN1
            }

            return Response({
                'tickers': tickers,
                'intervals': intervals
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            mt.shutdown()
