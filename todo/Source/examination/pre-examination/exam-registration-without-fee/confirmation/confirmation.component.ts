import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-confirmation',
  templateUrl: './confirmation.component.html',
  styleUrls: ['./confirmation.component.scss']
})

export class ConfirmationComponent implements OnInit {

  StatusForm: FormGroup;

  constructor(private dialogRef: MatDialogRef<ConfirmationComponent>, private formBuilder: FormBuilder, @Inject(MAT_DIALOG_DATA) public data) { }

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
