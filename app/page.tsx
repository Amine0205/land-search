'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, RotateCcw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Person {
  id: string;
  name: string;
  created_at: string;
}

interface LandPlot {
  id: string;
  person_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  person?: Person;
}

const LAND_WIDTH = 1000;
const LAND_HEIGHT = 800;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function LandOwnershipApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [plots, setPlots] = useState<LandPlot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [highlightedPlots, setHighlightedPlots] = useState<string[]>([]);

  // Colors for different people (cycling through)
  const plotColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const fetchData = useCallback(async () => {
    const { data: peopleData } = await supabase
      .from('people')
      .select('*')
      .order('name');

    const { data: plotsData } = await supabase
      .from('land_plots')
      .select(`
        *,
        people (*)
      `)
      .order('created_at');

    if (peopleData) setPeople(peopleData);
    if (plotsData) {
      const formattedPlots = plotsData.map(plot => ({
        ...plot,
        person: plot.people
      }));
      setPlots(formattedPlots);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Set up transformation
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(zoom, zoom);

    // Draw land boundary
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, LAND_WIDTH, LAND_HEIGHT);

    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let x = 0; x <= LAND_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, LAND_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= LAND_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LAND_WIDTH, y);
      ctx.stroke();
    }

    // Draw plots
    plots.forEach((plot, index) => {
      const color = plotColors[index % plotColors.length];
      const isHighlighted = highlightedPlots.includes(plot.id);

      // Fill plot
      ctx.fillStyle = color + '80'; // Add transparency
      ctx.fillRect(plot.x, plot.y, plot.width, plot.height);

      // Draw border
      ctx.strokeStyle = isHighlighted ? '#EF4444' : color;
      ctx.lineWidth = isHighlighted ? 4 : 2;
      ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);

      // Draw owner name
      if (zoom > 0.5) {
        ctx.fillStyle = '#1F2937';
        ctx.font = `${Math.max(12, 16 / zoom)}px Inter`;
        ctx.textAlign = 'center';
        const textX = plot.x + plot.width / 2;
        const textY = plot.y + plot.height / 2;
        ctx.fillText(plot.person?.name || 'Unknown', textX, textY);
      }
    });

    ctx.restore();
  }, [plots, zoom, offsetX, offsetY, highlightedPlots]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSelectedPerson(null);
      setHighlightedPlots([]);
      return;
    }

    const matchedPerson = people.find(person =>
      person.name.toLowerCase().includes(term.toLowerCase())
    );

    if (matchedPerson) {
      setSelectedPerson(matchedPerson);
      const personPlots = plots.filter(plot => plot.person_id === matchedPerson.id);
      setHighlightedPlots(personPlots.map(plot => plot.id));

      // Zoom to person's plots
      if (personPlots.length > 0) {
        const minX = Math.min(...personPlots.map(p => p.x));
        const maxX = Math.max(...personPlots.map(p => p.x + p.width));
        const minY = Math.min(...personPlots.map(p => p.y));
        const maxY = Math.max(...personPlots.map(p => p.y + p.height));

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setZoom(1.5);
        setOffsetX(CANVAS_WIDTH / 2 - centerX * 1.5);
        setOffsetY(CANVAS_HEIGHT / 2 - centerY * 1.5);
      }
    } else {
      setSelectedPerson(null);
      setHighlightedPlots([]);
    }
  };

  const resetView = () => {
    setZoom(0.8);
    setOffsetX(0);
    setOffsetY(0);
    setHighlightedPlots([]);
    setSelectedPerson(null);
    setSearchTerm('');
  };

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Village Land Ownership System
          </h1>
          <p className="text-slate-600">
            Manage and visualize land plots ownership in the village
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search and Controls Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Owner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    placeholder="Enter owner name..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {searchTerm && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-slate-600">Search Results:</h4>
                    {filteredPeople.length > 0 ? (
                      filteredPeople.map(person => (
                        <div
                          key={person.id}
                          className={`p-2 rounded-md border cursor-pointer transition-colors ${
                            selectedPerson?.id === person.id
                              ? 'bg-blue-50 border-blue-200'
                              : 'bg-white border-gray-200 hover:bg-gray-50'
                          }`}
                          onClick={() => handleSearch(person.name)}
                        >
                          <div className="font-medium">{person.name}</div>
                          <div className="text-sm text-gray-500">
                            {plots.filter(p => p.person_id === person.id).length} plots
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No results found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Map Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomIn}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={zoomOut}
                    className="flex-1"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetView}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset View
                </Button>
                <div className="text-sm text-gray-500 text-center">
                  Zoom: {Math.round(zoom * 100)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Owners:</span>
                  <Badge variant="secondary">{people.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Plots:</span>
                  <Badge variant="secondary">{plots.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Land Area:</span>
                  <Badge variant="secondary">{LAND_WIDTH}×{LAND_HEIGHT}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Village Land Map</CardTitle>
                {selectedPerson && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Showing plots for:</span>
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      {selectedPerson.name}
                    </Badge>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="relative bg-white rounded-lg border-2 border-gray-200 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    className="block mx-auto cursor-move"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                  
                  {/* Legend */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <h4 className="font-medium text-sm mb-2">Legend</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-red-500"></div>
                        <span>Highlighted Plots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-200 border border-gray-400"></div>
                        <span>Grid (50x50 units)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}