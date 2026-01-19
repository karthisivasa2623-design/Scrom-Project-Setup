# Scrom Project Setup
this repo consisit of procedure of how to conver playcanvas projec to scrom project 

The Procedure DOC contain in the Procedure folder has the detailed insturection of of how to convert the playcanvas project to SCROM project for the Elearing platform 

Context in the DOC:

Procedure
Aim

The main purpose of this document is to provide a detailed step-by-step procedure on how to convert a PlayCanvas project into a SCORM package.

Steps: PlayCanvas to SCORM File Conversion
1.     Export the Project from PlayCanvas
        Open your project in the PlayCanvas Editor.
        On the left-side vertical menu, click Publish / Download.
        The Build tab will be displayed.
        Under Publish to PlayCanvas / Download, select Download.zip.
          Configure the build settings:
            Enter the Title
            Select the Engine Version
            Enable Optimize Scene Format
            Under Choose Scene, select Main
            (If your project uses a different starting scene, select that scene instead.)
              Click DOWNLOAD.
              Once the build is complete, click DOWNLOAD again to download the ZIP file.
          Result:
            You will now have the exported PlayCanvas project as a ZIP file.

  4. Extract the Downloaded ZIP File

    Create a new folder to manage all SCORM-related files.
    Extract the downloaded PlayCanvas ZIP file into this folder.
    Note:
      It is recommended to perform all steps inside this single folder to avoid confusion.

3. Add Required SCORM Files

  Download the required files from the provided GitHub repository.
  Copy these files into the extracted PlayCanvas project folder.
  When prompted, allow the system to replace the existing index.html file.

4. Place the scorm.json File

  Place the scorm.json file in the main folder using the following structure:

    Main_Folder
    │
    ├── PlayCanvas_Exported_Project
    │     └── (Contains replaced index.html and other PlayCanvas files)
    │
    └── scorm.json

5. Open Command Prompt in the Folder

  Open the Main_Folder.
  Click on the folder address bar.
  Type cmd and press Enter.
  This will open the Command Prompt directly in the correct directory.

  6. Install and Run the SCORM Packager
     
    First-time use only:
       npm install -g simple-scorm-packager
    To create the SCORM package:
      npx simple-scorm-packager scorm.json

8. Enter SCORM Configuration Details

  When prompted, provide the following details:

    a. Version: Select SCORM 1.2
    b. Title: Enter your desired course title
    c. Organization: Enter any organization name
    d. Language: Press Enter (default: en)
    e. Pass Score: Enter a two-digit percentage (example: 80)
    f. Starting Page: index.html
    g. Identifier: Press Enter
    h. Unique Identifier: Press Enter
    i. Source Directory:

  Select the PlayCanvas exported project folder

  Choose “Choose this directory” when prompted

8. SCORM Package Creation

  A new folder named scorm will be generated.
  Inside this folder, a ZIP file containing the SCORM package will be available.

9. Upload the SCORM Package

  Upload the generated SCORM ZIP file to your Learning Management System (LMS).
  The PlayCanvas project is now ready to run as a SCORM course.

  Notes

    SCORM 1.2 is recommended for better LMS compatibility.

    Always test the SCORM package in an LMS or SCORM player before final deployment.

    Ensure index.html is set as the starting page.
