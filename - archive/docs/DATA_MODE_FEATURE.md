# Data Mode Feature Documentation

## Overview

The Data Mode feature allows you to run the CORE-SE demo application in three different modes:

1. **Real Data** - Connects to OPAL MCP Server and FDS (Fake Data Service)
2. **Static Fake Data** - Uses pre-generated fake data without any server connection
3. **Streaming Fake Data** - Uses fake data with live streaming updates for demos

This feature enables you to demonstrate the UI without requiring the OPAL and FDS servers to be running.

## How to Use

### Switching Data Modes

1. Navigate to the **Admin** section in the left sidebar
2. Click on **Data Management** tab
3. You'll see three mode options at the top:
   - **Real Data** - Requires OPAL (port 3001) and FDS (port 4000) servers
   - **Static Fake Data** - No servers needed, uses pre-generated data
   - **Streaming Fake Data** - No servers needed, simulates live updates every 5 seconds

4. Click on any mode card to switch. The active mode will be highlighted with a colored border and "Active" badge.

### Mode Descriptions

#### Real Data Mode
- **When to use**: When you have OPAL and FDS servers running
- **Behavior**: All API calls go to actual backend servers
- **Requirements**: 
  - OPAL MCP Server running on port 3001
  - FDS running on port 4000
  - Core Backend running on port 8000

#### Static Fake Data Mode
- **When to use**: Quick demos without server setup, offline presentations
- **Behavior**: Returns pre-generated fake data instantly
- **Requirements**: None - works completely offline
- **Data**: 50 requirements, 25 issues, 20 parts, 30 pulse items

#### Streaming Fake Data Mode
- **When to use**: Live demos, showcasing real-time updates
- **Behavior**: Returns pre-generated data + adds new pulse items every 5 seconds
- **Requirements**: None - works completely offline
- **Features**: Simulates live activity feed with new items appearing automatically

## For Developers

### Using Data Mode in Components

The data mode is managed by the `DataModeContext` and can be accessed using the `useDataMode` hook.

#### Basic Usage

```typescript
import { useDataMode } from '@/contexts/DataModeContext';

function MyComponent() {
  const { dataMode, setDataMode, isUsingFakeData, isStreaming } = useDataMode();
  
  // dataMode: 'real' | 'fake-static' | 'fake-streaming'
  // isUsingFakeData: boolean (true for both fake modes)
  // isStreaming: boolean (true only for fake-streaming mode)
  
  return (
    <div>
      Current mode: {dataMode}
      {isUsingFakeData && <p>Using fake data</p>}
    </div>
  );
}
```

#### Using the Custom Data Fetch Hook

```typescript
import { usePulseFeed, useRequirements } from '@/hooks/useDataFetch';

function PulseComponent() {
  const { pulseItems, loading, error } = usePulseFeed();
  
  // Automatically handles all three modes:
  // - Real: fetches from API
  // - Static: returns fake data
  // - Streaming: returns fake data + live updates
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {pulseItems.map(item => (
        <div key={item.id}>{item.artifact_ref.title}</div>
      ))}
    </div>
  );
}
```

### Creating Custom Data Fetch Logic

```typescript
import { useDataMode } from '@/contexts/DataModeContext';
import { generateFakeJamaItems } from '@/lib/fakeDataGenerators';

function useCustomData() {
  const { dataMode } = useDataMode();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    if (dataMode === 'real') {
      // Fetch from real API
      fetch('http://localhost:8000/api/data')
        .then(res => res.json())
        .then(setData);
    } else {
      // Use fake data
      setData(generateFakeJamaItems(50));
    }
  }, [dataMode]);
  
  return data;
}
```

### Available Fake Data Generators

Located in `src/lib/fakeDataGenerators.ts`:

- `generateFakeJamaItems(count)` - Generates requirements and test cases
- `generateFakeJiraIssues(count)` - Generates Jira issues
- `generateFakeWindchillParts(count)` - Generates parts/components
- `generateFakePulseItems(count)` - Generates pulse feed items
- `StreamingDataGenerator` - Class for generating streaming updates

### Data Persistence

The selected data mode is persisted in `localStorage` under the key `core_se_data_mode`. This means the user's preference is maintained across browser sessions.

## Architecture

### Context Structure

```
DataModeProvider (in layout.tsx)
  └── Provides: dataMode, setDataMode, isUsingFakeData, isStreaming
      └── All child components can access via useDataMode()
```

### Files

- `src/contexts/DataModeContext.tsx` - Context provider and hook
- `src/lib/fakeDataGenerators.ts` - Fake data generation functions
- `src/hooks/useDataFetch.ts` - Custom hooks for data fetching
- `src/components/AdminSection.tsx` - UI for switching modes

## Benefits

1. **Demo Flexibility** - Run demos without server dependencies
2. **Offline Capability** - Present the UI anywhere without internet
3. **Development Speed** - Test UI changes without backend running
4. **Live Demo Effects** - Streaming mode shows real-time updates
5. **Easy Switching** - Toggle between modes with one click

## Future Enhancements

- [ ] Add more fake data types (emails, calendar events, etc.)
- [ ] Configurable streaming interval
- [ ] Export/import fake datasets
- [ ] Mock API response delays for realistic testing
- [ ] Fake data generation settings (count, types, etc.)
