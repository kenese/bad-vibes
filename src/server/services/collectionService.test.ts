import { describe, it, expect } from 'vitest';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

/**
 * Test to verify that folder names with leading spaces are preserved
 * through XML parse/build cycle.
 * 
 * Context: Traktor uses leading spaces in folder names to control sort order.
 * If these spaces are trimmed, Traktor will resort all folders alphabetically.
 */

// Types for NML document structure
interface NmlNode {
  TYPE: string;
  NAME: string;
  SUBNODES?: {
    NODE?: NmlNode | NmlNode[];
    COUNT?: string;
  };
}

interface NmlDocument {
  NML: {
    PLAYLISTS: {
      NODE: NmlNode;
    };
  };
}

interface SimpleNodeDocument {
  NODE: {
    NAME: string;
  };
}

// Parser config matching collectionService.ts
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  allowBooleanAttributes: true,
  trimValues: false,  // Critical: preserve leading/trailing whitespace
});

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  format: true,
  suppressBooleanAttributes: false,
  preserveOrder: false,
});

describe('NML Folder Name Whitespace Preservation', () => {
  it('should preserve leading spaces in folder names through parse/build cycle', () => {
    const originalXml = `<?xml version="1.0" encoding="UTF-8"?>
<NML VERSION="20">
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="3">
        <NODE TYPE="FOLDER" NAME="       -   - - - - - - -  ALL VINYL">
          <SUBNODES COUNT="0"></SUBNODES>
        </NODE>
        <NODE TYPE="FOLDER" NAME="    -- ALL VINYL">
          <SUBNODES COUNT="0"></SUBNODES>
        </NODE>
        <NODE TYPE="FOLDER" NAME="     2022 best rap">
          <SUBNODES COUNT="0"></SUBNODES>
        </NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>`;

    // Parse the XML
    const parsed = parser.parse(originalXml) as NmlDocument;
    
    // Rebuild the XML
    const rebuilt = builder.build(parsed);
    
    // Parse the rebuilt XML to check the values
    const reparsed = parser.parse(rebuilt) as NmlDocument;
    
    // Get the folder names from the reparsed document
    const rootNode = reparsed.NML.PLAYLISTS.NODE;
    const subnodes = rootNode.SUBNODES?.NODE as NmlNode[];
    
    // Verify folder names still have leading spaces
    expect(subnodes[0]!.NAME).toBe('       -   - - - - - - -  ALL VINYL');
    expect(subnodes[1]!.NAME).toBe('    -- ALL VINYL');
    expect(subnodes[2]!.NAME).toBe('     2022 best rap');
  });

  it('should preserve folder names with various whitespace patterns', () => {
    const testCases = [
      '   Leading spaces',
      'Trailing spaces   ',
      '   Both ends   ',
      '  Multiple    internal   spaces  ',
      '\tTab character',
      '     5 leading spaces',
    ];

    for (const folderName of testCases) {
      const xml = `<NODE TYPE="FOLDER" NAME="${folderName}"></NODE>`;
      const parsed = parser.parse(xml) as SimpleNodeDocument;
      const rebuilt = builder.build(parsed);
      const reparsed = parser.parse(rebuilt) as SimpleNodeDocument;
      
      expect(reparsed.NODE.NAME).toBe(folderName);
    }
  });

  it('should preserve folder order after parse/build cycle', () => {
    const originalXml = `<?xml version="1.0" encoding="UTF-8"?>
<NML VERSION="20">
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="5">
        <NODE TYPE="FOLDER" NAME="Z Folder"></NODE>
        <NODE TYPE="FOLDER" NAME="A Folder"></NODE>
        <NODE TYPE="FOLDER" NAME="M Folder"></NODE>
        <NODE TYPE="PLAYLIST" NAME="First Playlist"></NODE>
        <NODE TYPE="FOLDER" NAME="B Folder"></NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>`;

    const parsed = parser.parse(originalXml) as NmlDocument;
    const rebuilt = builder.build(parsed);
    const reparsed = parser.parse(rebuilt) as NmlDocument;
    
    const subnodes = reparsed.NML.PLAYLISTS.NODE.SUBNODES?.NODE as NmlNode[];
    
    // Verify order is preserved (not alphabetically sorted)
    expect(subnodes[0]!.NAME).toBe('Z Folder');
    expect(subnodes[1]!.NAME).toBe('A Folder');
    expect(subnodes[2]!.NAME).toBe('M Folder');
    expect(subnodes[3]!.NAME).toBe('First Playlist');
    expect(subnodes[4]!.NAME).toBe('B Folder');
  });

  it('should handle real Traktor folder names with space prefixes for sorting', () => {
    // These are actual folder names from the user's collection
    // Traktor uses leading spaces to control sort order in the UI
    const originalXml = `<?xml version="1.0" encoding="UTF-8"?>
<NML VERSION="20">
  <PLAYLISTS>
    <NODE TYPE="FOLDER" NAME="$ROOT">
      <SUBNODES COUNT="6">
        <NODE TYPE="FOLDER" NAME="       -   - - - - - - -  ALL VINYL"></NODE>
        <NODE TYPE="FOLDER" NAME="    -- ALL VINYL"></NODE>
        <NODE TYPE="FOLDER" NAME="     2022 best rap"></NODE>
        <NODE TYPE="FOLDER" NAME="    2023 - cubadupa social"></NODE>
        <NODE TYPE="FOLDER" NAME="   2020 dec rap"></NODE>
        <NODE TYPE="FOLDER" NAME="2012"></NODE>
      </SUBNODES>
    </NODE>
  </PLAYLISTS>
</NML>`;

    const parsed = parser.parse(originalXml) as NmlDocument;
    const rebuilt = builder.build(parsed);
    const reparsed = parser.parse(rebuilt) as NmlDocument;
    
    const subnodes = reparsed.NML.PLAYLISTS.NODE.SUBNODES?.NODE as NmlNode[];
    
    // All folder names should be exactly preserved
    expect(subnodes[0]!.NAME).toBe('       -   - - - - - - -  ALL VINYL');
    expect(subnodes[1]!.NAME).toBe('    -- ALL VINYL');
    expect(subnodes[2]!.NAME).toBe('     2022 best rap');
    expect(subnodes[3]!.NAME).toBe('    2023 - cubadupa social');
    expect(subnodes[4]!.NAME).toBe('   2020 dec rap');
    expect(subnodes[5]!.NAME).toBe('2012');
    
    // Verify order is preserved
    expect(subnodes.map((n) => n.NAME)).toEqual([
      '       -   - - - - - - -  ALL VINYL',
      '    -- ALL VINYL',
      '     2022 best rap',
      '    2023 - cubadupa social',
      '   2020 dec rap',
      '2012',
    ]);
  });
});
