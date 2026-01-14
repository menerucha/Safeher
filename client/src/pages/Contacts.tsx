import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Edit2, Phone, Mail } from "lucide-react";
import * as deviceManager from "@/lib/deviceManager";

interface Contact {
  id: number;
  name: string;
  phone: string;
  email?: string;
  priority: number;
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const deviceId = deviceManager.getDeviceId();

  // Load contacts
  useEffect(() => {
    const cached = deviceManager.getCachedContacts();
    setContacts(cached as Contact[]);
  }, []);

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }

    const newContact: Contact = {
      id: Date.now(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email || undefined,
      priority: contacts.length,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    deviceManager.cacheContacts(updated);

    setFormData({ name: "", phone: "", email: "" });
    setIsAddingNew(false);
  };

  const handleDeleteContact = (id: number) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    deviceManager.cacheContacts(updated);
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }

    const updated = contacts.map(c =>
      c.id === editingId
        ? { ...c, name: formData.name, phone: formData.phone, email: formData.email || undefined }
        : c
    );

    setContacts(updated);
    deviceManager.cacheContacts(updated);

    setFormData({ name: "", phone: "", email: "" });
    setEditingId(null);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingId(contact.id);
    setFormData({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
    });
  };

  const handleCancel = () => {
    setIsAddingNew(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "" });
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Emergency Contacts</h1>
          <p className="text-gray-600">Manage people who will be notified in an emergency</p>
        </div>

        {/* Add/Edit Form */}
        {(isAddingNew || editingId !== null) && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg">
                {editingId ? "Edit Contact" : "Add New Contact"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleFormChange}
                  placeholder="Contact name"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  placeholder="Phone number"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  placeholder="Email address"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={editingId ? handleSaveEdit : handleAddContact}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {editingId ? "Save Changes" : "Add Contact"}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        <div className="space-y-3">
          {contacts.length === 0 ? (
            <Card>
              <CardContent className="pt-8 text-center">
                <p className="text-gray-600 mb-4">No emergency contacts yet</p>
                <Button
                  onClick={() => setIsAddingNew(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Contact
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {contacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{contact.name}</h3>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                          {contact.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          onClick={() => handleEditContact(contact)}
                          size="sm"
                          variant="outline"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteContact(contact.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!isAddingNew && editingId === null && (
                <Button
                  onClick={() => setIsAddingNew(true)}
                  variant="outline"
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Contact
                </Button>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-700">
              <strong>Tip:</strong> Add at least 2-3 trusted contacts who can help you in an emergency. They will receive SMS and email alerts with your location.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
