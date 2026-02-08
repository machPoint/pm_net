# Adding the Dashboard Image

## Steps to restore the dashboard screenshot:

1. **Save your dashboard image** as `hero-dashboard.png` 
2. **Copy it to the `public` folder** in this project
3. **Update the code** in `src/components/LandingPage.tsx`

## Code Update:

Find this line around line 270:
```jsx
<div
  className="h-full w-full bg-center bg-cover bg-secondary/20 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center"
  role="img"
  aria-label="App preview image">
  <div className="text-center text-muted-foreground p-8">
    <p className="text-lg font-medium mb-2">Dashboard Screenshot</p>
    <p className="text-sm">Add hero-dashboard.png to /public folder</p>
  </div>
</div>
```

Replace it with:
```jsx
<div
  className="h-full w-full bg-center bg-cover"
  role="img"
  aria-label="App preview image"
  style={{ backgroundImage: "url('/hero-dashboard.png')" }} />
```

## Then rebuild:
```bash
npm run build
```

The dashboard image will now show up in your static site!