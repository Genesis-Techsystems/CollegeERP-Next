import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { GenericFunctions } from 'app/main/common/generic-functions';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SnotifyService } from 'ng-snotify';
import { CrudService } from 'app/main/services/crud.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-marks-edit-modal',
  templateUrl: './marks-edit-modal.component.html',
  styleUrls: ['./marks-edit-modal.component.scss']
})

export class MarksEditModalComponent implements OnInit {

  marksForm: FormGroup;
  dialogTitle;

  constructor( private genericFunctions: GenericFunctions, private formBuilder: FormBuilder, private dialogRef: MatDialogRef<MarksEditModalComponent>,
               @Inject(MAT_DIALOG_DATA) public data, private snotifyService: SnotifyService,
               private crudService: CrudService, public router: Router) {

     // this.getData();
  }
  // tslint:disable-next-line:typedef
  ngOnInit() {
      this.dialogTitle = 'Edit Marks';
      this.marksForm = this.formBuilder.group({
        marksComments: ['', Validators.required],        
        marks: [],        
      });

      if (!this.isEmptyObject(this.data)) {
          this.marksForm.get('marks').setValue(this.data.marks);         
          this.marksForm.get('marksComments').setValue(this.data.marksComments);       
      }
  }

  // tslint:disable-next-line:typedef
  isEmptyObject(obj) {
      return (obj && (Object.keys(obj).length === 0));
  }

  submit(): void {
      const Obj = this.marksForm.value;
      if (this.marksForm.invalid) {
          return;
      } else {
          this.dialogRef.close(Obj);
      }
  }
}
