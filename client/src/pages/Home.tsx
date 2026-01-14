import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, Settings, Shield, MapPin, Smartphone } from "lucide-react";
import * as deviceManager from "@/lib/deviceManager";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isRegistered, setIsRegistered] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);

  useEffect(() => {
    const registered = deviceManager.isDeviceRegistered();
    setIsRegistered(registered);

    if (registered) {
      const info = deviceManager.getCachedDeviceInfo();
      setDeviceInfo(info);
    }
  }, []);

  if (!isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">SafeHer</h1>
            <p className="text-xl text-gray-600">Your Personal Emergency Safety Platform</p>
            <p className="text-gray-600 max-w-2xl mx-auto">
              One tap to alert emergency contacts. Real-time location sharing. No login required.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => setLocation("/register")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg text-lg"
            >
              Get Started
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
                <CardTitle>Instant SOS</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">One-tap emergency activation that works in under 2 seconds, even without internet.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <MapPin className="w-6 h-6 text-blue-600 mb-2" />
                <CardTitle>Live Location Sharing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Real-time location updates sent to emergency contacts throughout the emergency.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Users className="w-6 h-6 text-green-600 mb-2" />
                <CardTitle>Emergency Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Manage trusted contacts who receive SMS and email alerts with your location.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="w-6 h-6 text-purple-600 mb-2" />
                <CardTitle>Privacy First</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Your data is encrypted and never shared without your consent. Auto-delete old data.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Smartphone className="w-6 h-6 text-indigo-600 mb-2" />
                <CardTitle>Device-Based</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">No account login needed. One-time setup, always ready to help.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <AlertTriangle className="w-6 h-6 text-orange-600 mb-2" />
                <CardTitle>Offline Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">SOS requests are cached and automatically sent when internet returns.</p>
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <Card className="bg-white border-2 border-emerald-200">
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <p className="font-semibold text-gray-900">Register Your Device</p>
                  <p className="text-gray-600 text-sm">One-time setup with your name, phone, and emergency contacts.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <p className="font-semibold text-gray-900">Tap SOS When Needed</p>
                  <p className="text-gray-600 text-sm">One button activates emergency mode and notifies all contacts instantly.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <p className="font-semibold text-gray-900">Real-Time Tracking</p>
                  <p className="text-gray-600 text-sm">Your location is continuously shared until you cancel the emergency.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Registered user dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Welcome, {deviceInfo?.name || "User"}</h1>
          <p className="text-gray-600">Your safety is our priority</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <Button
            onClick={() => setLocation("/emergency")}
            className="h-24 bg-red-600 hover:bg-red-700 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <AlertTriangle className="w-6 h-6 mr-2" />
            Emergency SOS
          </Button>

          <Button
            onClick={() => setLocation("/contacts")}
            className="h-24 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Users className="w-6 h-6 mr-2" />
            Manage Contacts
          </Button>
        </div>

        {/* Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Device ID</span>
              <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">{deviceManager.getDeviceId()?.slice(0, 12)}...</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Phone</span>
              <span className="font-semibold">{deviceInfo?.phone}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Email</span>
              <span className="font-semibold">{deviceInfo?.email || "Not set"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Contacts</span>
              <span className="font-semibold">{deviceManager.getCachedContacts().length} registered</span>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">
              <strong>Remember:</strong> Keep your emergency contacts updated and ensure they have your phone number saved. Test the system with trusted contacts before an actual emergency.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
