import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, MapPin, Phone, X } from "lucide-react";
import * as deviceManager from "@/lib/deviceManager";
import { trpc } from "@/lib/trpc";

export default function Emergency() {
  const [isActive, setIsActive] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosEventId, setSosEventId] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const deviceId = deviceManager.getDeviceId();

  // Load contacts
  useEffect(() => {
    if (!deviceId) return;

    const loadContacts = async () => {
      try {
        // In production, fetch from server
        const cached = deviceManager.getCachedContacts();
        setContacts(cached);
      } catch (err) {
        console.error("Failed to load contacts:", err);
      }
    };

    loadContacts();
  }, [deviceId]);

  // Timer for active SOS
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSosActivate = async () => {
    if (!deviceId) {
      setError("Device not registered");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get current location
      const currentLocation = await deviceManager.getCurrentLocation();
      setLocation({ lat: currentLocation.latitude, lng: currentLocation.longitude });

      // Trigger SOS
      // In production, this would call the tRPC mutation
      const eventId = `event_${Date.now()}`;
      setSosEventId(eventId);
      setIsActive(true);
      setTimeElapsed(0);

      // Show notification
      deviceManager.sendNotification("Emergency Alert Activated", {
        body: "Emergency contacts have been notified of your location.",
        icon: "/alert-icon.png",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to activate SOS";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSosCancel = () => {
    setIsActive(false);
    setSosEventId(null);
    setTimeElapsed(0);
    setLocation(null);
  };

  if (isActive) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Active SOS Header */}
          <div className="text-center text-white space-y-2">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="w-20 h-20 animate-pulse" />
            </div>
            <h1 className="text-4xl font-bold">EMERGENCY ACTIVE</h1>
            <p className="text-lg opacity-90">Emergency contacts have been notified</p>
          </div>

          {/* Timer and Info */}
          <Card className="bg-white/10 border-white/20">
            <CardContent className="pt-6 space-y-4 text-white">
              <div className="text-center">
                <p className="text-sm opacity-75 mb-2">Time Elapsed</p>
                <p className="text-5xl font-mono font-bold">{formatTime(timeElapsed)}</p>
              </div>

              {location && (
                <div className="flex items-center gap-2 bg-white/10 p-3 rounded-lg">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="opacity-75">Location Sharing</p>
                    <p className="font-mono">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                  </div>
                </div>
              )}

              {contacts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm opacity-75">Contacts Notified</p>
                  <div className="space-y-1">
                    {contacts.slice(0, 3).map((contact) => (
                      <div key={contact.id} className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span>{contact.name}</span>
                      </div>
                    ))}
                    {contacts.length > 3 && (
                      <p className="text-sm opacity-75">+{contacts.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancel Button */}
          <Button
            onClick={handleSosCancel}
            variant="outline"
            className="w-full bg-white text-red-600 hover:bg-gray-100 font-bold py-3 rounded-lg"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel Emergency
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Emergency SOS</h1>
          <p className="text-gray-600">One tap to alert emergency contacts</p>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4">
              <p className="text-sm text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* SOS Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSosActivate}
            disabled={isLoading}
            className="w-32 h-32 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {isLoading ? "..." : "SOS"}
          </Button>
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Instant Alert</p>
                  <p className="text-sm text-gray-600">Your emergency contacts will be notified immediately with your location.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Real-Time Tracking</p>
                  <p className="text-sm text-gray-600">Your location will be continuously shared until you cancel.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {contacts.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{contacts.length} Contacts Ready</p>
                    <p className="text-sm text-gray-600">
                      {contacts.map(c => c.name).join(", ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
