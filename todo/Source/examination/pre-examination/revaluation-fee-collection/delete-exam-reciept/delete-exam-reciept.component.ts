import { Component, OnInit, Inject } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';


@Component({
  selector: 'app-delete-exam-reciept',
  templateUrl: './delete-exam-reciept.component.html',
  styleUrls: ['./delete-exam-reciept.component.scss']
})
export class DeleteExamRecieptComponent implements OnInit {

  StatusForm: FormGroup;

  constructor(private dialogRef: MatDialogRef<DeleteExamRecieptComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data) { }

  // tslint:disable-next-line:typedef
  ngOnInit() {
    this.StatusForm = this.formBuilder.group({
      reason: ['', Validators.required],
    });
  }

  submit(): void {
    const Obj = this.StatusForm.value;
    Obj.name = 'delete';
    if (this.StatusForm.invalid) {
      return;
    } else {
        this.dialogRef.close(Obj);
    }
  }

}