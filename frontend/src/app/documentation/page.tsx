'use client';

import React, { useState } from 'react';

// Import the CSS file for styles
import './styles.css'; // Ensure this path is correct based on your project structure

const DocumentationPage: React.FC = () => {
  // State to manage which sections are open
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  // Function to toggle section visibility
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="container mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold mb-4 text-center">Documentation</h1>
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 cursor-pointer text-center" onClick={() => toggleSection('aboutS100')}>
          About the S-100 Standard
        </h2>
        {openSections['aboutS100'] && (
          <div className="mb-4 border rounded-lg p-4">
            <p>
              The S-100 is an international standard for geospatial data. It provides a flexible framework for handling, sharing, and visualizing marine and hydrographic data. The S-100 standard replaces the older S-57 standard and supports advanced features like:
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li><strong>Scalability:</strong> Efficient storage of large datasets (e.g., submarine cables).</li>
              <li><strong>Interoperability:</strong> Standardized formats enable seamless data exchange between stakeholders.</li>
              <li><strong>Visualization:</strong> Enhanced mapping and geospatial tools for data analysis.</li>
            </ul>
            <p className="mt-4">
              Our website ensures that submarine cable data complies with the S-100 standard by validating and converting Route Position Lists (RPLs) into a standardized HDF5 format.
            </p>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 cursor-pointer text-center" onClick={() => toggleSection('convertRPL')}>
          Convert RPL to S-100 Format
        </h2>
        {openSections['convertRPL'] && (
          <div className="mb-4 border rounded-lg p-4">
            <ol className="list-decimal pl-6">
              <li className="mb-2">
                <strong>Upload the RPL File:</strong>
                <p className="ml-4">Navigate to the upload section on the website and choose your RPL file (in KMZ, Excel, or similar formats).</p>
              </li>
              <li className="mb-2">
                <strong>Validation:</strong>
                <p className="ml-4">The website validates the file to ensure all required fields are present and meet the S-100 standards. Clear feedback is provided if errors are found.</p>
              </li>
              <li className="mb-2">
                <strong>Conversion:</strong>
                <p className="ml-4">Once validated, the file is converted into the HDF5 format, structured according to the S-100 guidelines.</p>
              </li>
              <li>
                <strong>Download:</strong>
                <p className="ml-4">The converted HDF5 file is available for download for further use.</p>
              </li>
            </ol>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 cursor-pointer text-center" onClick={() => toggleSection('addCables')}>
          Add Cables
        </h2>
        {openSections['addCables'] && (
          <div className="mb-4 border rounded-lg p-4">
            <ol className="list-decimal pl-6">
              <li className="mb-2">
                <strong>Upload the HDF5 File:</strong>
                <p className="ml-4">The converted file can be uploaded to add the cable to the visualization database.</p>
              </li>
              <li>
                <strong>Visualization:</strong>
                <p className="ml-4">The website displays the new cable route on an interactive map, showing waypoints, cable details (e.g., depth, type), and geographic relationships with other cables.</p>
              </li>
            </ol>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 cursor-pointer text-center" onClick={() => toggleSection('crossingPoints')}>
          List of Crossing Points
        </h2>
        {openSections['crossingPoints'] && (
          <div className="mb-4 border rounded-lg p-4">
            <p>
              The website automatically identifies and displays crossing points where cables intersect. This feature helps stakeholders assess potential risks and ensure proper planning.
            </p>
            <ul className="list-disc pl-6 mt-2">
              <li><strong>Interactive List:</strong> A list of all crossing points is generated, including coordinates, depths, and overlapping cable names.</li>
              <li><strong>Map Visualization:</strong> Crossing points are marked on an interactive map for easy navigation and analysis.</li>
            </ul>
            <p className="mt-4">
              The map also includes international borders, Exclusive Economic Zones (EEZs), and jurisdictional boundaries to help users understand the legal and regulatory implications of cable routes.
            </p>
          </div>
        )}
      </section>

    </div>
  );
};

// Added CSS for nicer color scheme
// You can add this to your CSS file
export default DocumentationPage;
