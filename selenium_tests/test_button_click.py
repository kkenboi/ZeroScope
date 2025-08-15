from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
import time

# Set up Chrome WebDriver (make sure chromedriver is in your PATH)
driver = webdriver.Chrome()

try:
    # Open the frontend
    driver.get("http://localhost:5173/")  # Change to your frontend URL

    # Wait for the page to load
    time.sleep(2)

    # Find the "Reports" button by its text
    reports_button = driver.find_element(By.XPATH, "//div[@role='button' and contains(., 'Reports')]")

    # Click the button
    reports_button.click()
    print("Clicked the 'Reports' button.")

    # Wait for page to change
    time.sleep(2)

    print("Current URL:", driver.current_url)
    print("Page Title:", driver.title)

finally:
    driver.quit()
