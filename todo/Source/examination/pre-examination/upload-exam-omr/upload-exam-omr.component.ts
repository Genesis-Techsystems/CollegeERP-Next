import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { CONSTANTS } from 'app/main/common/constants';
import { CrudService } from 'app/main/services/crud.service';
import { SnotifyService } from 'ng-snotify';
// import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-upload-exam-omr',
  templateUrl: './upload-exam-omr.component.html',
  styleUrls: ['./upload-exam-omr.component.scss']
})
export class UploadExamOmrComponent implements OnInit {
  displayedColumns: string[] = ['folder', 'filename', 'status', 'view'];
  step = 0
  wrongFilesList = [];
  filesList = [];
  uploadedFiles = [];
  public formData;
  private uploadExamOmrUrl = CONSTANTS.uploadExamOmrUrl;
  file: any = [];
  @ViewChild('fileInput') fileInput: ElementRef;
  constructor(private crudService: CrudService, private snotifyService: SnotifyService,) { }
  ngOnInit() { }
  uploadFiles(files) {
    this.uploadedFiles = []
    this.formData = new FormData();
    if (this.fileInput.nativeElement.files.length > 0) {
      for (let i = 0; i < this.fileInput.nativeElement.files.length; i++) {
        this.formData.append('file',
          this.fileInput.nativeElement.files[i],
          this.fileInput.nativeElement.files[i].name);
        const path: string = this.fileInput.nativeElement.files[i].webkitRelativePath;
        const pathPieces = path.split('/');
        const currentFolder = pathPieces[1];
        pathPieces.pop();
        this.uploadedFiles.push({
          fileName: currentFolder,
          folder: pathPieces[0],
          status: '-',
          view: ''
        });
      }
    }
    //   const arrFiles = Array.from(files);
    // const folderHolder = {};
    //   arrFiles.forEach((file) => {

    //     const path: string = file['webkitRelativePath'];
    //    const pathname: string = file['name'];
    //     const pathPieces = path.split('/');
    //     const currentFolder = pathPieces[1];
    //     pathPieces.pop();
    //     this.uploadedFiles.push({
    //       fileName: currentFolder,
    //       folder: pathPieces[0],

    //     });
    //     });
    //   this.crudService
    //   .upload(this.uploadExamOmrUrl,this.formData)
    //   .subscribe(result1 => {
    //     if (result1){

    //              this.snotifyService.success(result1.message, 'Success!');

    //     }else {
    //         this.snotifyService.error(result1.message, 'Error!');
    //     }
    // }, error => {
    //     if (error.error.statusCode === 401){
    //         this.snotifyService.error(error.error.message, 'Error!');

    //     }else{
    //         this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
    //     }
    // });

  }
  submit() {
    this.crudService
      .upload(this.uploadExamOmrUrl, this.formData)
      .subscribe(result1 => {
        if (result1) {
          for (let i = 0; i < result1.length; i++) {
            this.file = result1[i].split('/')
            if (this.uploadedFiles.filter(x => (x.fileName == this.file[5]) ? x.status = 'Upload Success' : '-' ? x.view = result1[i] : '-')) {

            }
          }

          this.snotifyService.success(result1.message, 'Success!');
        } else {
          this.snotifyService.error(result1.message, 'Error!');
        }
      }, error => {
        if (error.error.statusCode === 401) {
          this.snotifyService.error(error.error.message, 'Error!');

        } else {
          this.snotifyService.error(CONSTANTS.message.CON_ERROR, 'Error!');
        }
      });

  }
}


