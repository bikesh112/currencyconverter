from django.contrib.auth.models import Group, User
from rest_framework import serializers

class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ['url', 'username', 'email', 'groups']

class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ['url', 'name']

class RatesRequestSerializer(serializers.Serializer):
    ticker = serializers.CharField(max_length=10)
    interval = serializers.CharField(max_length=20)
    no_of_rows = serializers.IntegerField(required=False)  # Make it optional
