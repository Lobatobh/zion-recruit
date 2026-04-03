"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  MapPin,
  FileText,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  Save,
} from "lucide-react";

interface ProfileEditorProps {
  token: string;
  candidate: CandidateProfile;
}

interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  photo?: string;
}

export function ProfileEditor({ token, candidate }: ProfileEditorProps) {
  const [profile, setProfile] = useState(candidate);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const completionPercentage = calculateCompletion();

  function calculateCompletion(): number {
    const fields = [
      'name',
      'email',
      'phone',
      'linkedin',
      'github',
      'portfolio',
      'resumeUrl',
      'city',
      'state',
      'country',
    ];
    const completed = fields.filter((field) => {
      const value = profile[field as keyof CandidateProfile];
      return value && value.toString().trim().length > 0;
    });
    return Math.round((completed.length / fields.length) * 100);
  }

  const handleChange = (field: keyof CandidateProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!profile.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (profile.linkedin && !isValidUrl(profile.linkedin)) {
      newErrors.linkedin = 'Invalid URL';
    }

    if (profile.github && !isValidUrl(profile.github)) {
      newErrors.github = 'Invalid URL';
    }

    if (profile.portfolio && !isValidUrl(profile.portfolio)) {
      newErrors.portfolio = 'Invalid URL';
    }

    if (profile.resumeUrl && !isValidUrl(profile.resumeUrl)) {
      newErrors.resumeUrl = 'Invalid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateProfile()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-portal-token': token,
        },
        body: JSON.stringify(profile),
      });

      const data = await response.json();
      if (response.ok) {
        setProfile(data.profile);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Completion</CardTitle>
          <CardDescription>
            Complete your profile to improve your chances of being noticed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={completionPercentage} className="flex-1" />
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          {completionPercentage < 100 && (
            <p className="text-sm text-muted-foreground mt-2">
              Add missing information to complete your profile
            </p>
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your basic contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={profile.name || ''}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="pl-10"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="pl-10"
                  placeholder="john@example.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={profile.phone || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="pl-10"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location
          </CardTitle>
          <CardDescription>
            Your current location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={profile.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                placeholder="San Francisco"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={profile.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                placeholder="California"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profile.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="United States"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Professional Links
          </CardTitle>
          <CardDescription>
            Add your professional profiles and portfolio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <div className="relative">
                <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="linkedin"
                  value={profile.linkedin || ''}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  className="pl-10"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              {errors.linkedin && (
                <p className="text-sm text-red-500">{errors.linkedin}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="github">GitHub Profile</Label>
              <div className="relative">
                <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="github"
                  value={profile.github || ''}
                  onChange={(e) => handleChange('github', e.target.value)}
                  className="pl-10"
                  placeholder="https://github.com/username"
                />
              </div>
              {errors.github && (
                <p className="text-sm text-red-500">{errors.github}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">Portfolio Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="portfolio"
                  value={profile.portfolio || ''}
                  onChange={(e) => handleChange('portfolio', e.target.value)}
                  className="pl-10"
                  placeholder="https://yourportfolio.com"
                />
              </div>
              {errors.portfolio && (
                <p className="text-sm text-red-500">{errors.portfolio}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="resumeUrl">Resume/CV URL</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="resumeUrl"
                  value={profile.resumeUrl || ''}
                  onChange={(e) => handleChange('resumeUrl', e.target.value)}
                  className="pl-10"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              {errors.resumeUrl && (
                <p className="text-sm text-red-500">{errors.resumeUrl}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saved && (
            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Profile saved successfully
            </Badge>
          )}
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
