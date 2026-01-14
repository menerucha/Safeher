import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import * as deviceManager from "@/lib/deviceManager";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function Register() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const registerMutation = trpc.device.register.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!formData.name.trim()) {
        throw new Error("Name is required");
      }
      if (!formData.phone.trim() || formData.phone.length < 10) {
        throw new Error("Valid phone number is required");
      }

      const deviceId = deviceManager.getOrCreateDeviceId();

      const result = await registerMutation.mutateAsync({
        deviceId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
      });

      if (result) {
        deviceManager.cacheDeviceInfo({
          deviceId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
        });

        setSuccess(true);
        setTimeout(() => {
          setLocation("/");
        }, 1500);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setError(message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-emerald-600" />
              <h2 className="text-2xl font-bold text-gray-900">Registration Complete</h2>
              <p className="text-gray-600">Your device has been registered. Redirecting...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">SafeHer Setup</CardTitle>
          <CardDescription>Register your device for emergency alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Your Name</label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                disabled={registerMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                disabled={registerMutation.isPending}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                disabled={registerMutation.isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg"
            >
              {registerMutation.isPending ? "Setting up..." : "Complete Setup"}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              This information helps emergency contacts reach you quickly.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
