/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      screens: {
        xs: "480px",
      },
      keyframes: {
        "gradient-xy": {
          "0%, 100%": {
            "background-position": "0% 50%",
          },
          "50%": {
            "background-position": "100% 50%",
          },
        },
        "gradient-bg": {
          "0%": {
            "background-position": "0% 0%",
          },
          "25%": {
            "background-position": "50% 0%",
          },
          "50%": {
            "background-position": "100% 100%",
          },
          "75%": {
            "background-position": "0% 100%",
          },
          "100%": {
            "background-position": "0% 0%",
          },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-20px)",
          },
        },
        typing: {
          "0%": {
            width: "0%",
          },
          "100%": {
            width: "100%"
          }
        },
        blink: {
          "0%": {
            borderColor: "rgb(34, 197, 94)"
          },
          "50%": {
            borderColor: "transparent"
          },
          "100%": {
            borderColor: "rgb(34, 197, 94)"
          }
        },
        "pulse-slow": {
          "0%, 100%": {
            opacity: 0.2,
          },
          "50%": {
            opacity: 0.6,
          },
        },
        "gradient-colors": {
          "0%": {
            "background-position": "0% 50%",
            "background-image": "linear-gradient(to right, rgba(255, 0, 0, 0.2), rgba(255, 165, 0, 0.2))",
          },
          "14%": {
            "background-image": "linear-gradient(to right, rgba(255, 165, 0, 0.2), rgba(255, 215, 0, 0.2))",
          },
          "28%": {
            "background-image": "linear-gradient(to right, rgba(255, 215, 0, 0.2), rgba(50, 205, 50, 0.2))",
          },
          "42%": {
            "background-image": "linear-gradient(to right, rgba(50, 205, 50, 0.2), rgba(30, 144, 255, 0.2))",
          },
          "56%": {
            "background-image": "linear-gradient(to right, rgba(30, 144, 255, 0.2), rgba(75, 0, 130, 0.2))",
          },
          "70%": {
            "background-image": "linear-gradient(to right, rgba(75, 0, 130, 0.2), rgba(138, 43, 226, 0.2))",
          },
          "84%": {
            "background-image": "linear-gradient(to right, rgba(138, 43, 226, 0.2), rgba(255, 105, 180, 0.2))",
          },
          "100%": {
            "background-position": "100% 50%",
            "background-image": "linear-gradient(to right, rgba(255, 105, 180, 0.2), rgba(255, 0, 0, 0.2))",
          },
        },
        "gradient-x": {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center"
          }
        }
      },
      animation: {
        "gradient-xy": "gradient-xy 15s ease infinite",
        "gradientBG": "gradient-bg 30s ease infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-medium": "float 6s ease-in-out infinite",
        "typing": "typing 3s steps(12) infinite alternate, blink .7s infinite",
        "pulse-slow": "pulse-slow 4s ease-in-out infinite",
        "pulse-slower": "pulse-slow 6s ease-in-out infinite",
        "pulse-slowest": "pulse-slow 8s ease-in-out infinite",
        "gradient-slow": "gradient-colors 30s ease infinite",
        "gradient-x": "gradient-x 4s ease infinite"
      },
    },
  },
  plugins: [],
};

export default config;
