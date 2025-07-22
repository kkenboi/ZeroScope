from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializer import UserSerializer

@api_view(['GET']) # Reading data
def get_users(request):
    users = User.objects.all()
    serializedData =  UserSerializer(users, many = True).data
    return Response(serializedData)
    
@api_view(['POST']) # Writing data
def create_user(request):
    data = request.data
    serializer = UserSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status = status.HTTP_201_CREATED)
    return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)

@api_view(['PUT', 'DELETE'])
def update_user(request, pk):
    try:
        user = User.objects.get(pk = pk)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'DELETE':
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    elif request.method == 'PUT':
        data = request.data
        serializer = UserSerializer(user, data = data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        else:
            return Response(serializer.errors, status = status.HTTP_400_BAD_REQUEST)
