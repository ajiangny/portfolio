/**
 * galleryData.ts — Gallery Section Artwork Data
 *
 * Array of artwork objects displayed on the Gallery floating stage.
 * Each artwork has an id, optional title, medium label (shown on hover),
 * a source path to the image in /public/art/, and its natural pixel
 * dimensions (w × h) — pieces render at this true aspect ratio, so keep
 * these in sync with the actual file when swapping an image.
 */

export interface Artwork {
  id: number
  title: string
  medium: string
  src: string
  w: number
  h: number
}

export const artworks: Artwork[] = [
  { id: 13, title: '', medium: 'Concept Art', src: '/art/art13.webp', w: 1600, h: 670 },
  { id: 1, title: '', medium: 'Digital Illustration', src: '/art/art1.webp', w: 1237, h: 1600 },
  { id: 2, title: '', medium: 'Digital Illustration', src: '/art/art2.webp', w: 1200, h: 1600 },
  { id: 5, title: '', medium: 'Concept Art', src: '/art/art5.webp', w: 1600, h: 900 },
  { id: 7, title: '', medium: 'Digital Illustration', src: '/art/art7.webp', w: 1280, h: 1600 },
  { id: 4, title: '', medium: 'Digital Illustration', src: '/art/art4.webp', w: 1280, h: 1600 },
  { id: 3, title: '', medium: 'Digital Illustration', src: '/art/art3.webp', w: 1280, h: 1600 },
  { id: 6, title: '', medium: 'Concept Art', src: '/art/art6.webp', w: 1600, h: 1120 },
  { id: 8, title: '', medium: 'Digital Illustration', src: '/art/art8.webp', w: 1280, h: 1600 },
  { id: 9, title: '', medium: 'Digital Illustration', src: '/art/art9.webp', w: 640, h: 800 },
  { id: 10, title: '', medium: 'Digital Illustration', src: '/art/art10.webp', w: 640, h: 800 },
  { id: 11, title: '', medium: 'Digital Illustration', src: '/art/art11.webp', w: 600, h: 800 },
  { id: 12, title: '', medium: 'Digital Illustration', src: '/art/art12.webp', w: 640, h: 800 },
  { id: 14, title: '', medium: 'Digital Illustration', src: '/art/art14.webp', w: 640, h: 800 },
  { id: 15, title: '', medium: 'Digital Illustration', src: '/art/art15.webp', w: 600, h: 800 },
  { id: 16, title: '', medium: 'Digital Illustration', src: '/art/art16.webp', w: 800, h: 640 },
  { id: 17, title: '', medium: 'Digital Illustration', src: '/art/art17.webp', w: 800, h: 800 },
  { id: 18, title: '', medium: 'Digital Illustration', src: '/art/art18.webp', w: 1440, h: 1080 },
  { id: 19, title: '', medium: 'Digital Illustration', src: '/art/art19.webp', w: 1600, h: 844 },
  { id: 20, title: '', medium: 'Digital Illustration', src: '/art/art20.webp', w: 600, h: 833 },
  { id: 21, title: '', medium: 'Digital Illustration', src: '/art/art21.webp', w: 1200, h: 1600 },
  { id: 22, title: '', medium: 'Digital Illustration', src: '/art/art22.webp', w: 1600, h: 1600 },
  { id: 23, title: '', medium: 'Digital Illustration', src: '/art/art23.webp', w: 1600, h: 1600 },
  { id: 24, title: '', medium: 'Digital Illustration', src: '/art/art24.webp', w: 1600, h: 900 },
];
