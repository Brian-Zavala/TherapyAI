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
        }
      },
      animation: {
        "gradient-xy": "gradient-xy 15s ease infinite",
        "gradientBG": "gradient-bg 30s ease infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "float-medium": "float 6s ease-in-out infinite",
        "typing": "typing 3s steps(12) infinite alternate, blink .7s infinite"
      },
    },
  },
  plugins: [],
};

export default config;
