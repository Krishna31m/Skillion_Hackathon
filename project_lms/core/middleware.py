import time
from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from django.core.cache import cache

# A simple cache key prefix
IDEMPOTENCY_CACHE_PREFIX = "idempotency_"

class RateLimitMiddleware(MiddlewareMixin):
    """
    Custom middleware for rate limiting (60 requests/minute/user).
    Uses a simple in-memory storage (settings.RATE_LIMIT_STORAGE) for demonstration.
    For production, this would use a robust, distributed cache like Redis.
    """
    def process_request(self, request):
        # Only check authenticated users
        if not request.user.is_authenticated:
            return None

        user_id = request.user.id
        now = int(time.time())
        limit = 60 # 60 requests per minute

        # Filter out requests older than 60 seconds
        settings.RATE_LIMIT_STORAGE[user_id] = [
            t for t in settings.RATE_LIMIT_STORAGE.get(user_id, [])
            if t > now - 60
        ]

        request_times = settings.RATE_LIMIT_STORAGE.get(user_id, [])

        if len(request_times) >= limit:
            return JsonResponse(
                {'error': 'Rate limit exceeded. Try again in a minute.', 'code': 'RATE_LIMIT'},
                status=429
            )

        request_times.append(now)
        settings.RATE_LIMIT_STORAGE[user_id] = request_times
        return None


class IdempotencyMiddleware(MiddlewareMixin):
    """
    Middleware to ensure POST/PUT/PATCH requests with an 'Idempotency-Key'
    header are processed only once, returning the cached response on subsequent
    identical requests within a short timeframe.
    """
    def process_request(self, request):
        key = request.headers.get('Idempotency-Key')
        method = request.method

        if method in ['POST', 'PUT', 'PATCH'] and key:
            cache_key = f"{IDEMPOTENCY_CACHE_PREFIX}{key}"

            # Check for a cached response
            cached_response = settings.IDEMPOTENCY_CACHE.get(cache_key)
            if cached_response:
                # Return the cached response with appropriate headers
                response = JsonResponse(cached_response['data'], status=cached_response['status'])
                response['X-Idempotency-Hit'] = 'true'
                return response
        return None

    def process_response(self, request, response):
        key = request.headers.get('Idempotency-Key')
        method = request.method

        if method in ['POST', 'PUT', 'PATCH'] and key and response.status_code < 400:
            cache_key = f"{IDEMPOTENCY_CACHE_PREFIX}{key}"

            # Cache the successful response
            cached_data = {
                'data': response.data if hasattr(response, 'data') else response.content.decode('utf-8'),
                'status': response.status_code,
                'timestamp': time.time()
            }
            # Cache for 1 hour (3600 seconds)
            settings.IDEMPOTENCY_CACHE[cache_key] = cached_data
            # In a real system, you'd use a dedicated cache (e.g., Redis: cache.set(cache_key, cached_data, 3600))

        return response